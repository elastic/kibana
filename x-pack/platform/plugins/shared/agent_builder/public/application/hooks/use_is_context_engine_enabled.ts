/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

/**
 * Whether the Context Engine is enabled in the current space.
 *
 * This is the same space-aware setting the server gates `configuration.ai_indices` on, so the
 * Context page is only reachable when the API will actually accept and return the field.
 */
export const useIsContextEngineEnabled = (): boolean => {
  return useUiSetting<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID, false);
};
