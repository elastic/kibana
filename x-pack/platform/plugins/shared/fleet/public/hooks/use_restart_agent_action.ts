/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_RESTART_AGENT_ACTION_FLAG } from '../../common/constants';

import { useStartServices } from '.';

/** Returns whether the Restart Agent action is enabled via the `fleet.enableRestartAgentAction` LaunchDarkly flag. Fallback is false. */
export const useRestartAgentAction = (): { isRestartAgentActionEnabled: boolean } => {
  const { featureFlags } = useStartServices();
  const isRestartAgentActionEnabled = featureFlags.useBooleanValue(
    ENABLE_RESTART_AGENT_ACTION_FLAG,
    false
  );
  return { isRestartAgentActionEnabled };
};
