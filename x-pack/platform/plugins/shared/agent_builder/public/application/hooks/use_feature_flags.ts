/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { FeatureFlags } from '../route_config';
import { useExperimentalFeatures } from './use_experimental_features';

export const useFeatureFlags = (): FeatureFlags => {
  const experimental = useExperimentalFeatures();
  const connectors = useUiSetting<boolean>(AGENT_BUILDER_CONNECTORS_ENABLED_SETTING_ID);
  return useMemo(() => ({ experimental, connectors }), [experimental, connectors]);
};
