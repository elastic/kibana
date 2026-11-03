/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { EvaluatorRegistry } from './evaluators/types';
import type { EvalsPluginStart } from './types';

/**
 * Parts of the start contract that the `server` entry (Kibana) and the `server/tasks` entry (task
 * pods) build the same way.
 */

export const createListEvaluators =
  (evaluatorRegistry: EvaluatorRegistry): NonNullable<EvalsPluginStart['listEvaluators']> =>
  async ({ spaceId }) => {
    const definitions = await evaluatorRegistry.asScoped({ spaceId }).list();

    return definitions.map((def) => ({
      name: def.name,
      version: def.version,
      kind: def.kind,
      origin: def.origin,
      description: def.description,
      needsJudgeConnector: def.kind === 'llm',
    }));
  };

export const createListModelConnectors =
  (
    inference: Pick<InferenceServerStart, 'getConnectorList'>
  ): NonNullable<EvalsPluginStart['listModelConnectors']> =>
  async (request) => {
    const connectors = await inference.getConnectorList(request);
    return connectors.map((connector) => ({
      id: connector.connectorId,
      name: connector.name,
      type: connector.type,
    }));
  };
