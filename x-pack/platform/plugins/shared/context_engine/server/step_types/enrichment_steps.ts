/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  DEFAULT_ENRICHMENT_REFRESH_AFTER,
  MIN_DREAMING_INTERVAL_MINUTES,
  RESERVED_ENTITY_ATTRIBUTE_KEYS,
  kiTypeFiltersOf,
} from '../../common/dreaming';
import {
  applyEnrichmentStepCommonDefinition,
  DEFAULT_ENRICHMENT_CANDIDATES,
  selectEnrichmentCandidatesStepCommonDefinition,
  type ApplyEnrichmentOutput,
  type SelectEnrichmentCandidatesOutput,
} from '../../common/step_types/enrichment';
import {
  DEFAULT_READ_KI_CONTENT_LENGTH,
  readKisStepCommonDefinition,
  type ReadKisOutput,
} from '../../common/step_types/read_kis';
import { parseIntervalMinutes } from '../../common/validation';
import { baseContent } from '../dreaming/access_patterns';
import { readActiveKis } from '../dreaming/active_kis';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { applyEnrichment, selectEnrichmentCandidates } from '../dreaming/enrichment';
import type { ResearchStepDependencies } from './helpers';
import { kiWriterFromContext } from './helpers';
import { prepareResearchStep } from './research_steps';

const MINUTE_MS = 60_000;
const truncate = (text: string, length: number): string =>
  text.length <= length ? text : `${text.slice(0, length - 1)}…`;

/** A KI as a model reads it: its content without the rendered access patterns, shortened. */
const readableKi = (ki: DreamedKi, maxContentLength: number): ReadKisOutput['kis'][number] => {
  const content = baseContent(ki.content);
  const attributes = Object.fromEntries(
    Object.entries(ki.attributes ?? {}).filter(
      ([key]) => !RESERVED_ENTITY_ATTRIBUTE_KEYS.includes(key)
    )
  );
  return {
    id: ki.id,
    type: ki.type,
    title: ki.title,
    ...(ki.description && { description: ki.description }),
    ...(content && { content: truncate(content, maxContentLength) }),
    ...(typeof ki.updated_at === 'string' && { updated_at: ki.updated_at }),
    ...(Object.keys(attributes).length > 0 && { attributes }),
  };
};

export const getReadKisStepDefinition = (deps: ResearchStepDependencies) =>
  createServerStepDefinition({
    ...readKisStepCommonDefinition,
    handler: async (context) => {
      const {
        ai_index_id: aiIndexId,
        ids,
        max_content_length: maxContentLength = DEFAULT_READ_KI_CONTENT_LENGTH,
      } = context.input;
      const { spaceId, aiIndex, esClient } = await prepareResearchStep(
        deps,
        context,
        aiIndexId,
        'read'
      );
      const kis = await readActiveKis({
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        spaceId,
        ids: typeof ids === 'string' ? [ids] : ids,
        abortSignal: context.abortSignal,
      });
      const output: ReadKisOutput = { kis: kis.map((ki) => readableKi(ki, maxContentLength)) };
      return { output };
    },
  });

export const getSelectEnrichmentCandidatesStepDefinition = (deps: ResearchStepDependencies) =>
  createServerStepDefinition({
    ...selectEnrichmentCandidatesStepCommonDefinition,
    handler: async (context) => {
      const { ai_index_id: aiIndexId, limit = DEFAULT_ENRICHMENT_CANDIDATES } = context.input;
      const { spaceId, aiIndex, esClient } = await prepareResearchStep(
        deps,
        context,
        aiIndexId,
        'read'
      );
      const enrichment = aiIndex.dreaming?.enrichment;
      const refreshAfterMinutes =
        parseIntervalMinutes(enrichment?.refresh_after ?? DEFAULT_ENRICHMENT_REFRESH_AFTER) ??
        MIN_DREAMING_INTERVAL_MINUTES;
      const output: SelectEnrichmentCandidatesOutput = await selectEnrichmentCandidates({
        esClient,
        dest: aiIndex.dest,
        spaceId,
        kiTypes: kiTypeFiltersOf(enrichment),
        refreshAfterMs: refreshAfterMinutes * MINUTE_MS,
        limit,
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });

export const getApplyEnrichmentStepDefinition = (deps: ResearchStepDependencies) =>
  createServerStepDefinition({
    ...applyEnrichmentStepCommonDefinition,
    handler: async (context) => {
      const {
        ai_index_id: aiIndexId,
        ki_id: kiId,
        expected_updated_at: expectedUpdatedAt,
        changes,
        evidence,
        dry_run: dryRun = false,
      } = context.input;
      const { spaceId, aiIndex, esClient, stepContext } = await prepareResearchStep(
        deps,
        context,
        aiIndexId,
        'write'
      );
      const outcome = await applyEnrichment({
        esClient,
        aiIndexId,
        dest: aiIndex.dest,
        spaceId,
        writer: kiWriterFromContext(stepContext),
        kiId,
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
        change: changes,
        evidence,
        dryRun,
        abortSignal: context.abortSignal,
      });
      const document = outcome.status === 'skipped' ? undefined : (outcome.document as DreamedKi);
      deps.logger.debug(
        `${
          dryRun ? 'Dry run: enrichment' : 'Enrichment'
        } of KI '${kiId}' in AI index '${aiIndexId}': ${
          outcome.status === 'skipped'
            ? `skipped, ${outcome.reason}`
            : outcome.improved
            ? `improved, citing ${outcome.cited.length} results`
            : 'nothing to add'
        }`
      );
      const output: ApplyEnrichmentOutput = {
        status: outcome.status,
        improved: outcome.improved,
        ...(outcome.status === 'skipped' && { reason: outcome.reason }),
        cited: outcome.cited,
        dropped_citations: outcome.dropped_citations,
        tally: {
          improved: outcome.improved ? 1 : 0,
          unchanged: outcome.status !== 'skipped' && !outcome.improved ? 1 : 0,
          skipped: outcome.status === 'skipped' ? 1 : 0,
        },
        would_write:
          dryRun && document
            ? [{ id: kiId, change: 'updated', type: document.type, title: document.title }]
            : [],
        ...(document && { document }),
      };
      return { output };
    },
  });
