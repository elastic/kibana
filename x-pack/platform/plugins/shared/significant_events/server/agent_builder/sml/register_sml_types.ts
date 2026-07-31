/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderSmlPluginSetup } from '@kbn/agent-builder-sml-plugin/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventSmlType } from './significant_event_sml_type';

export const registerAgentBuilderSmlTypes = ({
  agentBuilderSml,
  getScopedClients,
  server,
}: {
  agentBuilderSml?: AgentBuilderSmlPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
}): void => {
  agentBuilderSml?.registerType(
    createSignificantEventSmlType({
      getScopedClients,
      server,
    })
  );
};
