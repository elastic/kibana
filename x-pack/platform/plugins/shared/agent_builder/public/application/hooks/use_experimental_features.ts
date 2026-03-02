/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';

export interface ClientExperimentalFeatures {
  /** Whether the planning mode feature is enabled */
  planning: boolean;
  /** Whether the filestore feature is enabled */
  filestore: boolean;
  /** Whether the skills feature is enabled */
  skills: boolean;
}

/**
 * Hook to read the agent builder experimental features UI setting.
 * Returns a stable object with individual feature flags.
 */
export const useExperimentalFeatures = (): ClientExperimentalFeatures => {
  const { services } = useKibana();

  return useMemo(() => {
    const enabled = services.uiSettings?.get<boolean>(
      AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
      false
    );

    return {
      planning: !!enabled,
      filestore: !!enabled,
      skills: !!enabled,
    };
  }, [services.uiSettings]);
};
