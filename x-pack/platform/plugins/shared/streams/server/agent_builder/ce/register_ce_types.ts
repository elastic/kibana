/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import type { GetScopedClients } from '../../routes/types';
import { createSignificantEventCeType } from './significant_event_ce_type';

export const registerAgentBuilderCeTypes = ({
  contextEngine,
  getScopedClients,
}: {
  contextEngine?: ContextEnginePluginSetup;
  getScopedClients: GetScopedClients;
}): void => {
  contextEngine?.registerType(
    createSignificantEventCeType({
      getScopedClients,
    })
  );
};
