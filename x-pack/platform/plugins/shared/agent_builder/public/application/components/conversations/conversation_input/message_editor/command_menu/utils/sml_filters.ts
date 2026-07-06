/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common/agents/definition';
import type { ContextEngineSearchConstraints } from '@kbn/context-engine-plugin/public';
import { ContextEngineSearchFilterType } from '@kbn/context-engine-plugin/public';

// Three states: undefined → no constraints (all connectors visible),
// [] → no connectors allowed, ['id1', ...] → only those connectors.
export const buildSmlScopingFromAgent = (
  agent: AgentDefinition | null
): ContextEngineSearchConstraints | undefined => {
  const connectorIds = agent?.configuration?.connector_ids;
  if (connectorIds === undefined) {
    return undefined;
  }
  return { [ContextEngineSearchFilterType.connector]: { ids: connectorIds } };
};
