/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type {
  CreateCloudOnboardingDeploymentRequest,
  UpdateCloudOnboardingDeploymentRequest,
} from '@kbn/fleet-plugin/public';
import {
  sendCreateCloudOnboardingDeployment,
  sendUpdateCloudOnboardingDeployment,
} from '@kbn/fleet-plugin/public';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useAwsServiceMatrix } from '../../use_aws_service_matrix';
import { getServiceDisplayNames } from '../services_step/service_display_names';
import { getOnboardingSessionKey } from '../../core/onboarding_session_storage';

export interface UseOnboardingSOResult {
  /** Creates the SO (best-effort). Returns the new deployment id, or null on failure. */
  createDeployment: (
    params: CreateCloudOnboardingDeploymentRequest['body']
  ) => Promise<string | null>;
  /** Updates the SO. Shows a toast on failure. Returns true on success, false on failure. */
  updateDeployment: (
    id: string,
    update: UpdateCloudOnboardingDeploymentRequest['body']
  ) => Promise<boolean>;
  /**
   * After a successful create, wires the deployment id into session storage, context, and URL.
   * Must be called before onContinue so the edit-mode guard fires before the next render.
   */
  persistDeploymentId: (deploymentId: string) => void;
}

export function useOnboardingSO(): UseOnboardingSOResult {
  const { services } = useKibana<CoreStart>();
  const history = useHistory();
  const { integrationId } = useParams<{ integrationId: string }>();
  const { updateDetectAndReviewStep } = useOnboardingFlow();
  const { matrix } = useAwsServiceMatrix();
  const { packageNameByServiceId, displayNameByServiceId } = useMemo(
    () => ({
      packageNameByServiceId: new Map((matrix ?? []).map((entry) => [entry.id, entry.packageName])),
      displayNameByServiceId: getServiceDisplayNames(matrix ?? []),
    }),
    [matrix]
  );
  // What the list of onboarding sessions needs without knowing the service catalog: the packages a
  // write covers, so the deployment can be listed under every package it touched, and the display
  // name of each service. Derived from the service set, and left out until the matrix has loaded.
  const withServiceDetails = useCallback(
    <T extends { services?: string[] }>(
      body: T
    ): T & { packageNames?: string[]; serviceNames?: Record<string, string> } => {
      if (!body.services || packageNameByServiceId.size === 0) return body;
      const packageNames = [
        ...new Set(
          body.services.flatMap((id) => {
            const packageName = packageNameByServiceId.get(id);
            return packageName ? [packageName] : [];
          })
        ),
      ];
      const serviceNames = Object.fromEntries(
        body.services.flatMap((id) => {
          const name = displayNameByServiceId.get(id);
          return name ? [[id, name]] : [];
        })
      );
      return {
        ...body,
        ...(packageNames.length ? { packageNames } : {}),
        ...(Object.keys(serviceNames).length ? { serviceNames } : {}),
      };
    },
    [packageNameByServiceId, displayNameByServiceId]
  );

  const createDeployment = useCallback(
    async (params: CreateCloudOnboardingDeploymentRequest['body']): Promise<string | null> => {
      const resp = await sendCreateCloudOnboardingDeployment(withServiceDetails(params)).catch(
        () => {
          services.notifications.toasts.addDanger(
            i18n.translate('xpack.ingestHub.authenticateAndDeployStep.soCreateError', {
              defaultMessage:
                'Could not save deployment record. Deploy will proceed, but resume may not be available.',
            })
          );
          return null;
        }
      );
      return resp?.item?.id ?? null;
    },
    [services, withServiceDetails]
  );

  const updateDeployment = useCallback(
    async (
      id: string,
      update: UpdateCloudOnboardingDeploymentRequest['body']
    ): Promise<boolean> => {
      try {
        await sendUpdateCloudOnboardingDeployment(id, withServiceDetails(update));
        return true;
      } catch {
        services.notifications.toasts.addDanger(
          i18n.translate('xpack.ingestHub.authenticateAndDeployStep.soUpdateError', {
            defaultMessage:
              'Could not update deployment record. Deploy outcome may not be reflected on resume.',
          })
        );
        return false;
      }
    },
    [services, withServiceDetails]
  );

  const persistDeploymentId = useCallback(
    (deploymentId: string) => {
      updateDetectAndReviewStep({ onboardingDeploymentId: deploymentId });
      // Set the session flag before replacing the URL so the reload guard in renderOnboardingApp
      // doesn't re-hydrate from the SO on the next navigation (which would overwrite in-progress edits).
      sessionStorage.setItem(
        getOnboardingSessionKey(integrationId, 'hydratedDeploymentId'),
        deploymentId
      );
      history.replace({
        ...history.location,
        search: `?deploymentId=${deploymentId}`,
      });
    },
    [updateDetectAndReviewStep, integrationId, history]
  );

  return { createDeployment, updateDeployment, persistDeploymentId };
}
