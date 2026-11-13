/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ConnectorSpecSummaryProvider } from '@kbn/agent-builder-server';
import { createConnectorSpecSummaryProvider } from '@kbn/agent-builder-server';

/** Connector spec provider backed by the actions plugin once it has started. */
export const getSpecProvider = (
  getActions: () => ActionsPluginStart | undefined
): ConnectorSpecSummaryProvider => {
  const actionsStart = getActions();
  if (!actionsStart) {
    throw new Error('The actions plugin has not started.');
  }
  return createConnectorSpecSummaryProvider({ actionsStart });
};
