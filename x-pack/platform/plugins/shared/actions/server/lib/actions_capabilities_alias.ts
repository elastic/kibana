/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, KibanaRequest } from '@kbn/core/server';
import { ACTIONS_V2_FEATURE_ID } from '../feature';

export const ACTIONS_UI_CAPABILITIES = [
  'show',
  'execute',
  'save',
  'delete',
  'endpointSecurityExecute',
] as const;

export const actionsCapabilitiesProvider = () => ({
  actions: {
    show: false,
    execute: false,
    save: false,
    delete: false,
    endpointSecurityExecute: false,
  },
});

// PoC alias so existing capabilities.actions.* readers keep working; final PR migrates readers.
export const actionsCapabilitiesSwitcher = (
  _request: KibanaRequest,
  capabilities: Capabilities,
  _useDefaultCapabilities: boolean
) => {
  const actionsV2 = capabilities[ACTIONS_V2_FEATURE_ID];
  if (!actionsV2) {
    return {};
  }

  const actions: Record<(typeof ACTIONS_UI_CAPABILITIES)[number], boolean> = {
    show: false,
    execute: false,
    save: false,
    delete: false,
    endpointSecurityExecute: false,
  };
  for (const capability of ACTIONS_UI_CAPABILITIES) {
    const value = actionsV2[capability];
    if (typeof value === 'boolean') {
      actions[capability] = value;
    }
  }

  return { actions };
};
