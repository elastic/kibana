/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  MAX_ONTOLOGY_HISTORY_ROUNDS,
  connectorDatasetName,
  resolveOntologyConfig,
} from '../../common/ontology';
import { readOntologyQueryHistoryStepCommonDefinition } from '../../common/step_types/read_ontology_query_history';
import { DEFAULT_TRACE_SETTLE_MINUTES } from '../../common/step_types/read_trace_transcripts';
import { readOntologyQueryHistory } from '../ontology/query_history';
import type { DreamingStepDependencies } from './helpers';
import { findSource, getAiIndexForStep } from './ontology_helpers';

const MINUTE_MS = 60 * 1000;

/** Collects the ES|QL queries or connector calls agents ran on one source, as the workflow user. */
export const getReadOntologyQueryHistoryStepDefinition = (
  deps: DreamingStepDependencies,
  { getCurrentDate = () => new Date() }: { getCurrentDate?: () => Date } = {}
) =>
  createServerStepDefinition({
    ...readOntologyQueryHistoryStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const {
        ai_index_id: aiIndexId,
        source_id: sourceId,
        datasets,
        since,
        size = MAX_ONTOLOGY_HISTORY_ROUNDS,
      } = context.input;
      const aiIndex = await getAiIndexForStep(deps, {
        request: context.contextManager.getFakeRequest(),
        aiIndexId,
        spaceId,
      });
      const empty = { output: { queries: [], rounds: 0, sources: [] } };
      const source = aiIndex ? findSource(aiIndex, sourceId) : undefined;
      if (
        !aiIndex ||
        !source ||
        aiIndex.traces.length === 0 ||
        !resolveOntologyConfig(aiIndex.dreaming?.ontology).queryHistory
      ) {
        return empty;
      }
      const until = new Date(
        getCurrentDate().getTime() - DEFAULT_TRACE_SETTLE_MINUTES * MINUTE_MS
      ).toISOString();
      const output = await readOntologyQueryHistory({
        esClient: context.contextManager.getScopedEsClient(),
        traces: aiIndex.traces,
        target:
          source.type === 'connector'
            ? {
                kind: 'connector',
                connectorId: source.value,
                dataset: connectorDatasetName(source.value),
              }
            : { kind: 'esql', datasets },
        since,
        until,
        size,
      });
      return { output };
    },
  });
