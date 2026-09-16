/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import {
  sendResolveIacBlueprints,
  useIacProvisioner,
  UNIFIED_ONBOARDING_RENDER_FLOW,
} from '@kbn/fleet-plugin/public';

import { useOnboardingFlow } from './onboarding_flow_context';
import { getIacRenderIntegrations } from './step_components/authenticate_and_deploy_step/iac_render_integrations';
import type { ServiceVars } from './step_components/service_settings_step/use_service_settings';

/**
 * Fires the IaC Provisioner resolve call when the user leaves Service
 * Settings, so the Authenticate & Deploy step knows which identity workflows
 * a blueprint can actually deploy for the selected managed integrations.
 *
 * Fire-and-forget: the returned callback never blocks navigation, and any
 * failure simply leaves the coverage unset so the next step falls back to
 * manifest-derived capability.
 */
export function useResolveIacBlueprints(): (serviceVars: Record<string, ServiceVars>) => void {
  const { isIacProvisionerEnabled } = useIacProvisioner();
  const {
    servicesStep,
    awsServicesMap,
    invalidateIacBlueprintCoverage,
    commitIacBlueprintCoverage,
  } = useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;

  return useCallback(
    (serviceVars: Record<string, ServiceVars>) => {
      if (!isIacProvisionerEnabled) {
        return;
      }

      const managedIntegrationServiceIds = selectedServiceIds.filter((id) =>
        awsServicesMap
          ?.get(id)
          ?.deploymentMethods.some(({ method }) => method === 'managed_integration')
      );
      const integrations = getIacRenderIntegrations(
        managedIntegrationServiceIds,
        awsServicesMap,
        serviceVars
      );

      // Coverage from an earlier visit may describe a different selection —
      // drop it before (and regardless of) the new call settling. The token
      // lives in the provider, so in-flight calls stay invalidated across
      // Back/Next remounts of this hook.
      const token = invalidateIacBlueprintCoverage();
      if (integrations.length === 0) {
        return;
      }

      sendResolveIacBlueprints({
        provider: 'aws',
        flow: UNIFIED_ONBOARDING_RENDER_FLOW,
        integrations,
      })
        .then(({ data, error }) => {
          if (!error && data) {
            commitIacBlueprintCoverage(token, data.blueprints);
          }
        })
        .catch(() => {
          // Resolve is advisory — a failed call must never surface to the user
          // or interrupt the wizard.
        });
    },
    [
      isIacProvisionerEnabled,
      selectedServiceIds,
      awsServicesMap,
      invalidateIacBlueprintCoverage,
      commitIacBlueprintCoverage,
    ]
  );
}
