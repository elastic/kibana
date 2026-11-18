/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { MAX_ONTOLOGY_DATASETS_PER_RUN, resolveOntologyConfig } from '../../common/ontology';
import {
  catalogOntologySourcesStepCommonDefinition,
  type CatalogOntologySourcesOutput,
} from '../../common/step_types/catalog_ontology_sources';
import { catalogOntologySources } from '../ontology/catalog';
import type { DreamingStepDependencies } from './helpers';
import { getAiIndexForStep } from './ontology_helpers';

const emptyFor = (sourceId: string, error: string): CatalogOntologySourcesOutput => ({
  datasets: [],
  catalog: [],
  others: [],
  skipped: [],
  stale: [],
  existing: [],
  source: { id: sourceId, type: 'esql', value: '', datasets: 0, error },
});

/**
 * Catalogs and profiles the datasets one ES|QL source of an AI index reads from, as the workflow
 * user, so the run sees only the data its user may read.
 */
export const getCatalogOntologySourcesStepDefinition = (
  deps: DreamingStepDependencies,
  { getCurrentDate = () => new Date() }: { getCurrentDate?: () => Date } = {}
) =>
  createServerStepDefinition({
    ...catalogOntologySourcesStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const {
        ai_index_id: aiIndexId,
        source_id: sourceId,
        max_datasets: maxDatasets,
      } = context.input;
      const aiIndex = await getAiIndexForStep(deps, {
        request: context.contextManager.getFakeRequest(),
        aiIndexId,
        spaceId,
      });
      if (!aiIndex) {
        return { output: emptyFor(sourceId, 'Context Engine or its memory setting is off.') };
      }
      const config = resolveOntologyConfig(aiIndex.dreaming?.ontology);
      if (!config.enabled) {
        throw new ExecutionError({
          type: 'ValidationError',
          message: `AI index '${aiIndexId}' does not have ontology discovery turned on`,
        });
      }
      const output = await catalogOntologySources({
        esClient: context.contextManager.getScopedEsClient(),
        aiIndex,
        sourceId,
        spaceId,
        config,
        maxDatasets: maxDatasets ?? MAX_ONTOLOGY_DATASETS_PER_RUN,
        now: getCurrentDate(),
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });
