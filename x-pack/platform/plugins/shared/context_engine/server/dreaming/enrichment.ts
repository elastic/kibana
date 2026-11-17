/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ENRICHED_AT_ATTRIBUTE, OCCURRENCES_ATTRIBUTE } from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { MAX_KI_REFERENCES, MAX_KI_REFERENCE_DESCRIPTION_LENGTH } from '../../common/step_types/ki';
import type { Evidence } from '../../common/step_types/research';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import type { KiWriter } from '../ai_indices/ki_revision';
import { accessPatternsOf, baseContent, renderContent } from './access_patterns';
import { isActiveKi, kiTypeFilterQuery, writeKi, type KiWriteOutcome } from './active_kis';
import type { DreamedKi, DreamedKiReference } from './dreamed_ki';
import { memoryIdFromUri } from './ids';

/** How many KIs a candidate read scans, the newest first. */
const CANDIDATE_SCAN_SIZE = 500;
/** How much of a candidate's content the selecting model reads. */
const CANDIDATE_SUMMARY_LENGTH = 400;
/** A KI updated this long after it was enriched has changed since. */
const CHANGED_AFTER_ENRICHMENT_MS = 60_000;
/** At most how many evidence references enrichment keeps on a KI, the newest. */
export const MAX_EVIDENCE_REFERENCES = 20;

export type EnrichmentCandidateReason = 'never_enriched' | 'changed' | 'stale';

const REASON_ORDER: Record<EnrichmentCandidateReason, number> = {
  never_enriched: 0,
  changed: 1,
  stale: 2,
};

/** A KI enrichment could improve, as the selecting model reads it. */
export interface EnrichmentCandidate {
  id: string;
  type: string;
  title: string;
  description?: string;
  summary?: string;
  updated_at?: string;
  enriched_at?: string;
  occurrences?: number;
  reason: EnrichmentCandidateReason;
}

const truncate = (text: string, length: number): string =>
  text.length <= length ? text : `${text.slice(0, length - 1)}…`;

const timeOf = (value: unknown): number | undefined => {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? undefined : time;
};

/** Why a KI is due for enrichment, or `undefined` when it is not. */
export const enrichmentReason = (
  ki: Pick<DreamedKi, 'attributes'> & { updated_at?: unknown },
  refreshAfterMs: number,
  now: Date
): EnrichmentCandidateReason | undefined => {
  const enrichedAt = timeOf(ki.attributes?.[ENRICHED_AT_ATTRIBUTE]);
  if (enrichedAt === undefined) {
    return 'never_enriched';
  }
  const updatedAt = timeOf(ki.updated_at);
  if (updatedAt !== undefined && updatedAt - enrichedAt > CHANGED_AFTER_ENRICHMENT_MS) {
    return 'changed';
  }
  return now.getTime() - enrichedAt >= refreshAfterMs ? 'stale' : undefined;
};

/**
 * The KIs enrichment could improve now, best first: those never enriched, then those changed
 * since, then those enriched longer than `refreshAfterMs` ago. Within each, the KIs seen in the
 * most memories, then the most recently updated. Only active KIs visible in the space, of the
 * filtered types.
 */
export const selectEnrichmentCandidates = async ({
  esClient,
  dest,
  spaceId,
  kiTypes,
  refreshAfterMs,
  limit,
  now = new Date(),
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  kiTypes: readonly string[];
  refreshAfterMs: number;
  limit: number;
  now?: Date;
  abortSignal?: AbortSignal;
}): Promise<{ candidates: EnrichmentCandidate[]; scanned: number }> => {
  const response = await esClient.search<DreamedKi & { updated_at?: string }>(
    {
      index: dest.value,
      ignore_unavailable: true,
      size: CANDIDATE_SCAN_SIZE,
      sort: [{ updated_at: 'desc' }],
      collapse: { field: 'id' },
      _source: [
        'id',
        'type',
        'title',
        'description',
        'content',
        'attributes',
        'updated_at',
        'expires_at',
        'permissions',
        'governance.lifecycle.status',
      ],
      query: {
        bool: { filter: [kiTypeFilterQuery(kiTypes), buildAiIndexSpaceFilter(spaceId)] },
      },
    },
    { signal: abortSignal }
  );
  const hits = response.hits.hits;
  const candidates = hits
    .flatMap(({ _source: ki }) => {
      if (!ki?.id || !isActiveKi(ki, spaceId, now)) {
        return [];
      }
      const reason = enrichmentReason(ki, refreshAfterMs, now);
      if (reason === undefined) {
        return [];
      }
      const summary = baseContent(ki.content);
      const enrichedAt = ki.attributes?.[ENRICHED_AT_ATTRIBUTE];
      const occurrences = ki.attributes?.[OCCURRENCES_ATTRIBUTE];
      const candidate: EnrichmentCandidate = {
        id: ki.id,
        type: ki.type,
        title: ki.title,
        ...(ki.description && { description: ki.description }),
        ...(summary && { summary: truncate(summary, CANDIDATE_SUMMARY_LENGTH) }),
        ...(ki.updated_at && { updated_at: ki.updated_at }),
        ...(typeof enrichedAt === 'string' && { enriched_at: enrichedAt }),
        ...(typeof occurrences === 'number' && { occurrences }),
        reason,
      };
      return [candidate];
    })
    .sort(
      (a, b) =>
        REASON_ORDER[a.reason] - REASON_ORDER[b.reason] ||
        (b.occurrences ?? 0) - (a.occurrences ?? 0) ||
        (timeOf(b.updated_at) ?? 0) - (timeOf(a.updated_at) ?? 0)
    );
  return { candidates: candidates.slice(0, limit), scanned: hits.length };
};

/** Whether a reference cites evidence from a source, rather than a memory or another KI. */
const isEvidenceReference = ({ uri, relation }: DreamedKiReference): boolean =>
  relation === 'derived_from' && memoryIdFromUri(uri) === undefined;

/**
 * The references of a KI with evidence it now cites added: other references kept, and at most
 * {@link MAX_EVIDENCE_REFERENCES} evidence references, the newest.
 */
export const withEvidenceReferences = (
  current: readonly DreamedKiReference[] | undefined,
  evidence: readonly Evidence[]
): DreamedKiReference[] => {
  const others = (current ?? []).filter((reference) => !isEvidenceReference(reference));
  const added = evidence.map(({ uri, title, source }) => ({
    uri,
    relation: 'derived_from' as const,
    description: truncate(title ?? source, MAX_KI_REFERENCE_DESCRIPTION_LENGTH),
  }));
  const addedUris = new Set(added.map(({ uri }) => uri));
  const kept = (current ?? []).filter(
    (reference) => isEvidenceReference(reference) && !addedUris.has(reference.uri)
  );
  const room = Math.max(0, Math.min(MAX_EVIDENCE_REFERENCES, MAX_KI_REFERENCES - others.length));
  return [...others, ...[...kept, ...added].slice(-room)].slice(0, MAX_KI_REFERENCES);
};

/** What the enriching model returned for one KI. */
export interface EnrichmentChange {
  changed: boolean;
  title?: string;
  description?: string;
  content?: string;
  citations?: string[];
}

export type EnrichmentOutcome = KiWriteOutcome & {
  /** Whether the content changed, rather than only the time it was enriched. */
  improved: boolean;
  cited: string[];
  /** Citations of evidence the model was not shown. */
  dropped_citations: string[];
};

/**
 * Writes what enrichment found for a KI. An improvement replaces its content, keeping its access
 * patterns, and cites the evidence it is based on; one that cites no evidence it was shown is not
 * applied. Either way the KI records when it was enriched, so it is not picked again until it
 * changes or `refresh_after` passes. A KI that changed since it was read is left for the next run.
 */
export const applyEnrichment = async ({
  esClient,
  aiIndexId,
  dest,
  spaceId,
  writer,
  kiId,
  expectedUpdatedAt,
  change,
  evidence,
  dryRun = false,
  now = () => new Date(),
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  spaceId: string;
  writer: KiWriter;
  kiId: string;
  expectedUpdatedAt?: string;
  change: EnrichmentChange;
  evidence: readonly Evidence[];
  dryRun?: boolean;
  now?: () => Date;
  abortSignal?: AbortSignal;
}): Promise<EnrichmentOutcome> => {
  const shown = new Map(evidence.map((item) => [item.id, item]));
  const citations = [...new Set(change.citations ?? [])];
  const cited = citations.filter((id) => shown.has(id));
  const droppedCitations = citations.filter((id) => !shown.has(id));
  let improved = false;

  const outcome = await writeKi({
    esClient,
    aiIndexId,
    dest,
    spaceId,
    writer,
    kiId,
    dryRun,
    abortSignal,
    build: (current) => {
      if (!current || !isActiveKi(current, spaceId)) {
        return { skip: 'it no longer exists' };
      }
      if (expectedUpdatedAt !== undefined && current.updated_at !== expectedUpdatedAt) {
        return { skip: 'it changed since it was read; a later run improves it' };
      }
      const content = change.content?.trim();
      improved =
        change.changed &&
        content !== undefined &&
        content.length > 0 &&
        cited.length > 0 &&
        content !== baseContent(current.content)?.trim();
      const { governance: _governance, ...rest } = current;
      const references = improved
        ? withEvidenceReferences(
            current.references,
            cited.map((id) => shown.get(id) as Evidence)
          )
        : current.references;
      return {
        document: {
          ...rest,
          ...(improved && {
            content: renderContent(content, accessPatternsOf(current)),
            ...(change.title?.trim() && { title: change.title.trim() }),
            ...(change.description?.trim() && { description: change.description.trim() }),
          }),
          attributes: { ...current.attributes, [ENRICHED_AT_ATTRIBUTE]: now().toISOString() },
          ...(references && { references }),
        },
      };
    },
  });
  return {
    ...outcome,
    improved: outcome.status !== 'skipped' && improved,
    cited: improved ? cited : [],
    dropped_citations: droppedCitations,
  };
};
