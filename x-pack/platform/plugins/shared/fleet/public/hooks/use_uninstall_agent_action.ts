/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_UNINSTALL_AGENT_ACTION_FLAG } from '../../common/constants';

import { useStartServices } from '.';

/** Returns whether the Uninstall Agent action is enabled via the `fleet.enableUninstallAgentAction` flag. Fallback is true. */
export const useUninstallAgentAction = (): { isUninstallAgentActionEnabled: boolean } => {
  const { featureFlags } = useStartServices();
  const isUninstallAgentActionEnabled = featureFlags.useBooleanValue(
    ENABLE_UNINSTALL_AGENT_ACTION_FLAG,
    true
  );
  return { isUninstallAgentActionEnabled };
};
