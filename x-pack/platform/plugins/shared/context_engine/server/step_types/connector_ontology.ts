/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { resolveOntologyConfig } from '../../common/ontology';
import {
  catalogConnectorSourceStepCommonDefinition,
  sampleConnectorSourceStepCommonDefinition,
  type CatalogConnectorSourceOutput,
} from '../../common/step_types/connector_ontology';
import type { AiIndexItem, AiIndexSource } from '../../common/http_api/ai_indices';
import { catalogConnectorSource, sampleConnectorSource } from '../ontology/connector_catalog';
import type { DreamingStepDependencies } from './helpers';
import {
  connectorCallerFor,
  findSource,
  getAiIndexForStep,
  type OntologyStepExtras,
} from './ontology_helpers';

const skippedCatalog = (
  sourceId: string,
  value: string,
  reason: string
): CatalogConnectorSourceOutput => ({
  describe: false,
  datasets: [],
  tools: [],
  others: [],
  existing: [],
  skipped: reason,
  source: { id: sourceId, type: 'connector', value, datasets: 0, error: reason },
});

/** The connector source a connector ontology step works on, failing when ontology discovery is off. */
const connectorSourceFor = (aiIndex: AiIndexItem, sourceId: string): AiIndexSource | undefined => {
  if (!resolveOntologyConfig(aiIndex.dreaming?.ontology).enabled) {
    throw new ExecutionError({
      type: 'ValidationError',
      message: `AI index '${aiIndex.id}' does not have ontology discovery turned on`,
    });
  }
  const source = findSource(aiIndex, sourceId);
  return source?.type === 'connector' ? source : undefined;
};

/** Lists what a connector source can read, as the workflow user. */
export const getCatalogConnectorSourceStepDefinition = (
  deps: DreamingStepDependencies & OntologyStepExtras,
  { getCurrentDate = () => new Date() }: { getCurrentDate?: () => Date } = {}
) =>
  createServerStepDefinition({
    ...catalogConnectorSourceStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const { ai_index_id: aiIndexId, source_id: sourceId } = context.input;
      const request = context.contextManager.getFakeRequest();
      const aiIndex = await getAiIndexForStep(deps, { request, aiIndexId, spaceId });
      if (!aiIndex) {
        return {
          output: skippedCatalog(sourceId, '', 'Context Engine or its memory setting is off.'),
        };
      }
      const source = connectorSourceFor(aiIndex, sourceId);
      if (!source) {
        return {
          output: skippedCatalog(
            sourceId,
            '',
            'The AI index has no such connector source any more.'
          ),
        };
      }
      const { info } = await connectorCallerFor(deps.getActions, request, source.value);
      const output = await catalogConnectorSource({
        esClient: context.contextManager.getScopedEsClient(),
        dest: aiIndex.dest,
        spaceId,
        sourceId,
        info,
        config: resolveOntologyConfig(aiIndex.dreaming?.ontology),
        now: getCurrentDate(),
        abortSignal: context.abortSignal,
      });
      return { output };
    },
  });

/** Runs the planned sample calls of read sub-actions on a connector source, as the workflow user. */
export const getSampleConnectorSourceStepDefinition = (
  deps: DreamingStepDependencies & OntologyStepExtras
) =>
  createServerStepDefinition({
    ...sampleConnectorSourceStepCommonDefinition,
    handler: async (context) => {
      const { spaceId } = context.contextManager.getContext().workflow;
      const { ai_index_id: aiIndexId, source_id: sourceId, calls } = context.input;
      const request = context.contextManager.getFakeRequest();
      const aiIndex = await getAiIndexForStep(deps, { request, aiIndexId, spaceId });
      const source = aiIndex ? connectorSourceFor(aiIndex, sourceId) : undefined;
      if (!aiIndex || !source) {
        return { output: { samples: [], catalog: [], rejected: [] } };
      }
      const { client, info } = await connectorCallerFor(deps.getActions, request, source.value);
      const output = await sampleConnectorSource({
        actionsClient: client,
        info,
        sourceId,
        calls,
        valueSamples: resolveOntologyConfig(aiIndex.dreaming?.ontology).valueSamples,
      });
      return { output };
    },
  });
