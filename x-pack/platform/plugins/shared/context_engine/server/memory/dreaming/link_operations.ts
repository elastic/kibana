/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import { LONG_TERM_MEMORY_INDEX, MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { LongTermMemoryType } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { buildActiveLongTermFilter } from './candidates';
import { buildEntityKey, isEntityKind } from './entity_type';
import type { CheckQuestion, MatchQuestion } from './link_prompts';
import {
  LINK_CHECK_OUTPUT_SCHEMA,
  LINK_CHECK_SYSTEM_PROMPT,
  LINK_FIND_OUTPUT_SCHEMA,
  LINK_MATCH_OUTPUT_SCHEMA,
  LINK_MATCH_SYSTEM_PROMPT,
  buildLinkCheckInput,
  buildLinkFindSystemPrompt,
  buildLinkMatchInput,
} from './link_prompts';
import { findLinks } from './links';
import type { DreamOperation, LongTermMemoryTypeDefinition } from './long_term_types';
import { readAttribute, readListAttribute } from './long_term_types';
import { buildDreamInput } from './prompt';
import {
  RELATIONSHIP_ENDPOINT_TYPES,
  normalizeRelation,
  readRelationshipEnds,
} from './relationship_type';

/** Search hits offered for one name. */
export const MATCH_OPTIONS = 5;
/** The top hit wins without a model call when it scores at least this many times the next one. */
export const MATCH_SCORE_MARGIN = 1.5;
/** Existing links a proposed link is checked against. */
export const MAX_RELATED_LINKS = 10;
const MAX_EXISTING_LINKS = 100;

interface LinkEnd {
  id?: string;
  name?: string;
  type?: string;
  kind?: string;
}

interface ProposedLink {
  from: LinkEnd;
  relation: string;
  to: LinkEnd;
  description: string;
  sourceIds: string[];
}

interface ResolvedLink {
  fromId: string;
  relation: string;
  toId: string;
  description: string;
  sourceIds: string[];
}

interface ScoredMemory {
  memory: StoredMemoryDocument;
  score: number;
}

export interface ProposeLinkOperationsParams {
  esClient: ElasticsearchClient;
  inferenceClient: InferenceClient;
  connectorId: string;
  spaceId: string;
  definition: LongTermMemoryTypeDefinition;
  sessions: Map<string, StoredMemoryDocument[]>;
  /** The memories shown to the model, which it may name by id. */
  candidates: StoredMemoryDocument[];
  /** Existing links between the candidates. */
  links: StoredMemoryDocument[];
  now: string;
  logger: Logger;
  signal?: AbortSignal;
}

export interface ProposeLinkOperationsResult {
  operations: DreamOperation[];
  /** Proposed links that were dropped before they became operations. */
  dropped: number;
}

type OutputRecord = Record<string, unknown>;

const asRecords = (value: unknown): OutputRecord[] =>
  Array.isArray(value)
    ? value.filter((item): item is OutputRecord => typeof item === 'object' && item !== null)
    : [];

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asTexts = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const fieldOf = (output: unknown, field: string): unknown =>
  typeof output === 'object' && output !== null ? (output as OutputRecord)[field] : undefined;

const toLinkEnd = (link: OutputRecord, end: 'from' | 'to'): LinkEnd => ({
  id: asText(link[`${end}_id`]),
  name: asText(link[`${end}_title`]),
  type: asText(link[`${end}_type`])
    ?.toLowerCase()
    .replace(/^memory\./, ''),
  kind: asText(link[`${end}_kind`])?.toLowerCase(),
});

const toProposedLinks = (output: unknown): ProposedLink[] =>
  asRecords(fieldOf(output, 'links')).flatMap((link) => {
    const relation = asText(link.relation);
    const sourceIds = asTexts(link.source_ids);
    return relation && sourceIds.length > 0
      ? [
          {
            from: toLinkEnd(link, 'from'),
            relation: normalizeRelation(relation),
            to: toLinkEnd(link, 'to'),
            description: asText(link.description) ?? '',
            sourceIds,
          },
        ]
      : [];
  });

const toOutdates = (output: unknown, knownLinkIds: Set<string>): DreamOperation[] =>
  asRecords(fieldOf(output, 'outdate')).flatMap((outdate) => {
    const targetId = asText(outdate.target_id);
    return targetId && knownLinkIds.has(targetId)
      ? [
          {
            op: 'outdate' as const,
            target_id: targetId,
            source_ids: asTexts(outdate.source_ids),
            reason: asText(outdate.reason),
          },
        ]
      : [];
  });

const normalizeName = (value: string) => value.trim().toLowerCase();

const lookupKey = ({ name = '', type = '' }: LinkEnd) => `${type}|${normalizeName(name)}`;

const toEndTypes = (type: string | undefined): LongTermMemoryType[] => {
  const endType = RELATIONSHIP_ENDPOINT_TYPES.find((candidate) => candidate === `memory.${type}`);
  return endType ? [endType] : [...RELATIONSHIP_ENDPOINT_TYPES];
};

const isExactMatch = (memory: StoredMemoryDocument, { name = '', kind }: LinkEnd) => {
  const wanted = normalizeName(name);
  return (
    normalizeName(memory.title) === wanted ||
    readListAttribute(memory, MEMORY_ATTRIBUTES.entityAliases).some(
      (alias) => normalizeName(alias) === wanted
    ) ||
    (isEntityKind(kind) &&
      readAttribute(memory, MEMORY_ATTRIBUTES.key) === buildEntityKey(kind, name))
  );
};

const readEnds = (link: StoredMemoryDocument) => ({
  ...readRelationshipEnds(link),
  relation: readAttribute(link, MEMORY_ATTRIBUTES.relationshipRelation),
});

/**
 * Stage 2 of a dream: the model proposes links, naming each end by id or by name; names are
 * matched to long-term memories by search, with a model call only for close calls; each link is
 * then checked against the existing links it may repeat or replace. Links with an unmatched end
 * are dropped.
 */
export const proposeLinkOperations = async ({
  esClient,
  inferenceClient,
  connectorId,
  spaceId,
  definition,
  sessions,
  candidates,
  links,
  now,
  logger,
  signal,
}: ProposeLinkOperationsParams): Promise<ProposeLinkOperationsResult> => {
  const found = await inferenceClient.output({
    id: `context_engine_memory_dream_${definition.type}`,
    connectorId,
    system: buildLinkFindSystemPrompt(definition),
    input: buildDreamInput({ sessions, candidates, links, definition }),
    schema: LINK_FIND_OUTPUT_SCHEMA,
    abortSignal: signal,
    retry: { onValidationError: 1 },
  });
  const outdates = toOutdates(found.output, new Set(links.map(({ id }) => id)));
  const proposed = toProposedLinks(found.output);
  if (proposed.length === 0) {
    return { operations: outdates, dropped: 0 };
  }

  const shown = new Map(candidates.map((memory) => [memory.id, memory]));
  const titles = new Map(candidates.map(({ id, title }) => [id, title]));
  const label = (end: LinkEnd) =>
    end.name ?? (end.id ? titles.get(end.id) : undefined) ?? end.id ?? 'unknown';
  const sentence = ({ from, relation, to }: ProposedLink) =>
    `${label(from)} ${relation.replace(/_/g, ' ')} ${label(to)}`;

  const needsMatch = (end: LinkEnd) => !(end.id && shown.has(end.id)) && end.name !== undefined;
  const lookups = new Map<string, LinkEnd & { usedIn: string[] }>();
  for (const link of proposed) {
    for (const end of [link.from, link.to].filter(needsMatch)) {
      const key = lookupKey(end);
      const lookup = lookups.get(key) ?? { ...end, usedIn: [] };
      lookup.usedIn.push(sentence(link));
      lookups.set(key, lookup);
    }
  }

  const matched = new Map<string, string>();
  const questions: Array<MatchQuestion & { key: string }> = [];
  if (lookups.size > 0) {
    const entries = [...lookups.entries()];
    const searches = entries.flatMap(([, { name = '', type }]): MsearchRequestItem[] => [
      { index: LONG_TERM_MEMORY_INDEX, ignore_unavailable: true, allow_no_indices: true },
      {
        size: MATCH_OPTIONS,
        track_total_hits: false,
        query: {
          bool: {
            filter: buildActiveLongTermFilter({ spaceId, types: toEndTypes(type), now }),
            must: [{ multi_match: { query: name, fields: ['title^3', 'description', 'content'] } }],
          },
        },
      },
    ]);
    const { responses } = await esClient.msearch<StoredMemoryDocument>({ searches }, { signal });
    responses.forEach((response, index) => {
      if ('error' in response) {
        throw new Error(response.error.reason ?? response.error.type);
      }
      const [key, lookup] = entries[index];
      const hits: ScoredMemory[] = response.hits.hits.flatMap(({ _source: memory, _score }) =>
        memory ? [{ memory, score: _score ?? 0 }] : []
      );
      hits.forEach(({ memory }) => titles.set(memory.id, memory.title));
      const exact = hits.find(({ memory }) => isExactMatch(memory, lookup));
      const [top, next] = hits;
      if (exact) {
        matched.set(key, exact.memory.id);
      } else if (top && next && top.score >= MATCH_SCORE_MARGIN * next.score) {
        matched.set(key, top.memory.id);
      } else if (top) {
        questions.push({
          key,
          ref: `n${questions.length + 1}`,
          name: lookup.name ?? '',
          type: lookup.type,
          kind: lookup.kind,
          usedIn: lookup.usedIn,
          options: hits.map(({ memory }) => memory),
        });
      }
    });
  }

  if (questions.length > 0) {
    const response = await inferenceClient.output({
      id: `context_engine_memory_dream_${definition.type}_match`,
      connectorId,
      system: LINK_MATCH_SYSTEM_PROMPT,
      input: buildLinkMatchInput(questions),
      schema: LINK_MATCH_OUTPUT_SCHEMA,
      abortSignal: signal,
      retry: { onValidationError: 1 },
    });
    const byRef = new Map(questions.map((question) => [question.ref, question]));
    for (const match of asRecords(fieldOf(response.output, 'matches'))) {
      const question = byRef.get(asText(match.ref) ?? '');
      const id = asText(match.id);
      if (question && id && question.options.some((option) => option.id === id)) {
        matched.set(question.key, id);
      }
    }
  }

  const resolveEnd = (end: LinkEnd) => (needsMatch(end) ? matched.get(lookupKey(end)) : end.id);

  let dropped = 0;
  const drop = (what: string, why: string) => {
    dropped++;
    logger.debug(`Dropped proposed relationship '${what}': ${why}`);
  };

  const resolved = new Map<string, ResolvedLink>();
  for (const link of proposed) {
    const fromId = resolveEnd(link.from);
    const toId = resolveEnd(link.to);
    if (!fromId || !toId) {
      drop(sentence(link), 'an end matches no long-term memory');
      continue;
    }
    if (fromId === toId) {
      drop(sentence(link), 'it links a memory to itself');
      continue;
    }
    const key = `${fromId}|${link.relation}|${toId}`;
    const existing = resolved.get(key);
    resolved.set(key, {
      fromId,
      relation: link.relation,
      toId,
      description: existing?.description || link.description,
      sourceIds: [...new Set([...(existing?.sourceIds ?? []), ...link.sourceIds])],
    });
  }
  if (resolved.size === 0) {
    return { operations: outdates, dropped };
  }

  const endIds = [...new Set([...resolved.values()].flatMap(({ fromId, toId }) => [fromId, toId]))];
  const fetched = await findLinks({
    esClient,
    spaceId,
    ids: endIds,
    now,
    size: MAX_EXISTING_LINKS,
    signal,
  });
  const existingLinks = new Map([
    ...links.map((link): [string, StoredMemoryDocument] => [link.id, link]),
    ...fetched.map(({ id, document }): [string, StoredMemoryDocument] => [id, document]),
  ]);

  const toCreate = (link: ResolvedLink): DreamOperation => ({
    op: 'create',
    from_id: link.fromId,
    relation: link.relation,
    to_id: link.toId,
    description: link.description,
    source_ids: link.sourceIds,
  });
  const linkTitle = ({ fromId, relation, toId }: ResolvedLink) =>
    `${titles.get(fromId) ?? fromId} ${relation.replace(/_/g, ' ')} ${titles.get(toId) ?? toId}`;

  const operations: DreamOperation[] = [];
  const checks: Array<CheckQuestion & { link: ResolvedLink }> = [];
  for (const link of resolved.values()) {
    const related = [...existingLinks.values()].filter((existing) => {
      const ends = readEnds(existing);
      const samePair =
        (ends.fromId === link.fromId && ends.toId === link.toId) ||
        (ends.fromId === link.toId && ends.toId === link.fromId);
      const sharedEnd = ends.fromId === link.fromId || ends.toId === link.toId;
      return samePair || (ends.relation === link.relation && sharedEnd);
    });
    const same = related.find((existing) => {
      const ends = readEnds(existing);
      return (
        ends.fromId === link.fromId && ends.toId === link.toId && ends.relation === link.relation
      );
    });
    if (same) {
      operations.push({ op: 'reinforce', target_id: same.id, source_ids: link.sourceIds });
    } else if (related.length === 0) {
      operations.push(toCreate(link));
    } else {
      checks.push({
        ref: `p${checks.length + 1}`,
        sentence: linkTitle(link),
        description: link.description,
        related: related.slice(0, MAX_RELATED_LINKS),
        link,
      });
    }
  }

  if (checks.length > 0) {
    const response = await inferenceClient.output({
      id: `context_engine_memory_dream_${definition.type}_check`,
      connectorId,
      system: LINK_CHECK_SYSTEM_PROMPT,
      input: buildLinkCheckInput(checks),
      schema: LINK_CHECK_OUTPUT_SCHEMA,
      abortSignal: signal,
      retry: { onValidationError: 1 },
    });
    const decisions = new Map(
      asRecords(fieldOf(response.output, 'decisions')).map((decision) => [
        asText(decision.ref) ?? '',
        decision,
      ])
    );
    for (const { ref, sentence: what, related, link } of checks) {
      const decision = decisions.get(ref);
      const op = asText(decision?.op) ?? 'create';
      const targetId = asText(decision?.target_id);
      const reason = asText(decision?.reason);
      if (op === 'create') {
        operations.push(toCreate(link));
      } else if (op === 'skip') {
        drop(what, reason ?? 'the check skipped it');
      } else if (
        (op === 'reinforce' || op === 'supersede') &&
        targetId &&
        related.some(({ id }) => id === targetId)
      ) {
        operations.push(
          op === 'reinforce'
            ? { op, target_id: targetId, source_ids: link.sourceIds, reason }
            : { ...toCreate(link), op, target_id: targetId, reason }
        );
      } else {
        drop(what, `the check returned '${op}' without a listed target`);
      }
    }
  }

  return { operations: [...operations, ...outdates], dropped };
};
