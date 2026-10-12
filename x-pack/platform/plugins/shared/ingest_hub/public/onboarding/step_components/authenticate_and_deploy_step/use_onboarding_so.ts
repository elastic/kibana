/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
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
  sendGetCloudOnboardingDeployment,
  sendUpdateCloudOnboardingDeployment,
} from '@kbn/fleet-plugin/public';

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { getOnboardingSessionKey } from '../../onboarding_session_storage';

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
  /**
   * The record a launched stack reports its role to, created on first use. Undefined when it
   * could not be created; Launch then goes on without the stack reporting back, so no toast.
   */
  ensurePendingDeployment: (
    params: CreateCloudOnboardingDeploymentRequest['body']
  ) => Promise<string | undefined>;
  /**
   * For Deploy's initial create: takes over the record created at Launch, so the stack's
   * identity and the deployment share one record. Null when there is none, or it was created for
   * a region or data format Deploy cannot change; the caller then creates a new one.
   */
  adoptPendingDeployment: (
    params: CreateCloudOnboardingDeploymentRequest['body']
  ) => Promise<string | null>;
}

export function useOnboardingSO(): UseOnboardingSOResult {
  const { services } = useKibana<CoreStart>();
  const history = useHistory();
  const { integrationId } = useParams<{ integrationId: string }>();
  const { updateDetectAndReviewStep, authenticateAndDeployStep, setPendingOnboardingDeploymentId } =
    useOnboardingFlow();
  const { pendingOnboardingDeploymentId } = authenticateAndDeployStep;

  const createDeployment = useCallback(
    async (params: CreateCloudOnboardingDeploymentRequest['body']): Promise<string | null> => {
      const resp = await sendCreateCloudOnboardingDeployment(params).catch(() => {
        services.notifications.toasts.addDanger(
          i18n.translate('xpack.ingestHub.authenticateAndDeployStep.soCreateError', {
            defaultMessage:
              'Could not save deployment record. Deploy will proceed, but resume may not be available.',
          })
        );
        return null;
      });
      return resp?.item?.id ?? null;
    },
    [services]
  );

  const updateDeployment = useCallback(
    async (
      id: string,
      update: UpdateCloudOnboardingDeploymentRequest['body']
    ): Promise<boolean> => {
      try {
        await sendUpdateCloudOnboardingDeployment(id, update);
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
    [services]
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

  const ensurePendingDeployment = useCallback(
    async (params: CreateCloudOnboardingDeploymentRequest['body']) => {
      if (pendingOnboardingDeploymentId) {
        return pendingOnboardingDeploymentId;
      }
      const resp = await sendCreateCloudOnboardingDeployment(params).catch(() => null);
      const id = resp?.item?.id;
      if (id) {
        setPendingOnboardingDeploymentId(id);
      }
      return id;
    },
    [pendingOnboardingDeploymentId, setPendingOnboardingDeploymentId]
  );

  const adoptPendingDeployment = useCallback(
    async (params: CreateCloudOnboardingDeploymentRequest['body']): Promise<string | null> => {
      const id = pendingOnboardingDeploymentId;
      if (!id) {
        return null;
      }
      setPendingOnboardingDeploymentId(undefined);
      try {
        const { item } = await sendGetCloudOnboardingDeployment(id);
        if (
          (item.globalRegion ?? '') !== (params.globalRegion ?? '') ||
          item.dataFormat !== params.dataFormat
        ) {
          return null;
        }
        await sendUpdateCloudOnboardingDeployment(id, {
          mechanisms: params.mechanisms,
          services: params.services,
          serviceVars: params.serviceVars,
          connectorId: params.connectorId ?? null,
          authMethod: params.authMethod ?? null,
        });
        return id;
      } catch {
        return null;
      }
    },
    [pendingOnboardingDeploymentId, setPendingOnboardingDeploymentId]
  );

  return {
    createDeployment,
    updateDeployment,
    persistDeploymentId,
    ensurePendingDeployment,
    adoptPendingDeployment,
  };
}
