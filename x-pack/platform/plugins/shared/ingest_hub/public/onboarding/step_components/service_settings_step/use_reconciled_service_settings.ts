/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { reconcileInstances } from './instances';
import {
  DEFAULT_SERVICE_SETTINGS,
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceInstance,
  type ServiceSettingsPersistedState,
} from './use_service_settings';

/**
 * The Step 2 settings from session storage, with `instances` reconciled against the current
 * selection. For steps that read the settings without going through Step 2: what is stored is only
 * as fresh as the last visit to Step 2, so it can be empty or stale after jumping ahead, a reload
 * or a resume, or after the selection changed in Step 1.
 */
export function useReconciledServiceSettings(): ServiceSettingsPersistedState & {
  instances: ServiceInstance[];
} {
  const { servicesStep, awsServicesMap } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;
  const [stored] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );

  return useMemo(() => {
    const settings = stored ?? DEFAULT_SERVICE_SETTINGS;
    return {
      ...settings,
      instances: reconcileInstances(
        settings.instances ?? [],
        selectedServiceIds,
        awsServicesMap ?? new Map()
      ),
    };
  }, [stored, selectedServiceIds, awsServicesMap]);
}
