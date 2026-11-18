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

const EMPTY: CatalogOntologySourcesOutput = {
  datasets: [],
  catalog: [],
  skipped: [],
  stale: [],
  existing: [],
  sources: [],
};

/**
 * Catalogs and profiles the datasets the ES|QL sources of an AI index read from, as the workflow
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
      const { ai_index_id: aiIndexId, max_datasets: maxDatasets } = context.input;
      const aiIndex = await getAiIndexForStep(deps, {
        request: context.contextManager.getFakeRequest(),
        aiIndexId,
        spaceId,
      });
      if (!aiIndex) {
        return { output: EMPTY };
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
        spaceId,
        config,
        maxDatasets: maxDatasets ?? MAX_ONTOLOGY_DATASETS_PER_RUN,
        now: getCurrentDate(),
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });
