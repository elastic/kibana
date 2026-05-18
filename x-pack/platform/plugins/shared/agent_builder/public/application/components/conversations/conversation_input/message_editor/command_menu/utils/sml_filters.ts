/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common/agents/definition';
import type { SmlSearchFilters } from '@kbn/agent-context-layer-plugin/public';
import { SmlSearchFilterType } from '@kbn/agent-context-layer-plugin/public';

// Three states: undefined → no filtering (all connectors visible),
// [] → no connectors allowed, ['id1', ...] → only those connectors.
export const buildSmlFiltersFromAgent = (
  agent: AgentDefinition | null
): SmlSearchFilters | undefined => {
  const connectorIds = agent?.configuration?.connector_ids;
  if (connectorIds === undefined) {
    return undefined;
  }
  return { [SmlSearchFilterType.connector]: { ids: connectorIds } };
};
