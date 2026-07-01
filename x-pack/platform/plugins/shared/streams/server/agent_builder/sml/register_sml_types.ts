/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentContextLayerPluginSetup } from '@kbn/agent-context-layer-plugin/server';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventSmlType } from './significant_event_sml_type';

export const registerAgentBuilderSmlTypes = ({
  agentContextLayer,
  getScopedClients,
}: {
  agentContextLayer?: AgentContextLayerPluginSetup;
  getScopedClients: GetScopedClients;
}): void => {
  agentContextLayer?.registerType(
    createSignificantEventSmlType({
      getScopedClients,
    })
  );
};
