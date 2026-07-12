/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  AGENT_BUILDER_OPENCODE_SUBAGENT_SETTING_ID,
} from '@kbn/management-settings-ids';

export const useExperimentalFeatures = (): boolean => {
  return useUiSetting<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
};

/**
 * Whether the experimental coding sub-agent (Sandboxes) capability is enabled.
 * Gates the Sandboxes management page and the per-agent sandbox attach section.
 */
export const useSandboxesEnabled = (): boolean => {
  return useUiSetting<boolean>(AGENT_BUILDER_OPENCODE_SUBAGENT_SETTING_ID);
};
