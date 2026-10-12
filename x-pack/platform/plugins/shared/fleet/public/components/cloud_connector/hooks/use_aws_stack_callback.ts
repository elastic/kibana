/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';

import type { AccountType } from '../../../types';
import type { GetAwsStackCallbackResponse } from '../../../../common/types/rest_spec/cloud_onboarding_deployment';
import { useAwsStackCallbackEnabled } from '../../../hooks';
import {
  sendGetAwsStackCallback,
  sendStartAwsStackCallback,
} from '../../../hooks/use_request/cloud_onboarding_deployment';

import type { TemplateRendered } from './use_cloud_connector_template';

const POLL_INTERVAL_MS = 5_000;

export interface AwsStackCallbackHost {
  /**
   * The onboarding deployment a launched stack reports to, created if needed. Undefined stops the
   * launch, since the stack would have nowhere to report.
   */
  ensureOnboardingDeploymentId: () => Promise<string | undefined>;
}

export type AwsStackCallbackState = Omit<GetAwsStackCallbackResponse, 'expiresAt'>;

const isPendingStatus = (status: AwsStackCallbackState['status'] | undefined) =>
  status === 'waiting' || status === 'completing';

interface UseAwsStackCallbackParams {
  host?: AwsStackCallbackHost;
  connectorName: string;
  accountType: AccountType;
  /** Called once the identity the stack reported has been created; should be stable. */
  onConnectorCreated: (connector: { id: string; name?: string }) => void;
}

/**
 * Makes a launched stack report its role back: the stack gets parameters that point it at an
 * upload form, and Kibana creates the identity once the report arrives, without the user copying
 * any ARN. Polls only while this form is open; a background task finishes it otherwise.
 */
export const useAwsStackCallback = ({
  host,
  connectorName,
  accountType,
  onConnectorCreated,
}: UseAwsStackCallbackParams) => {
  const isFlagEnabled = useAwsStackCallbackEnabled();
  const isEnabled = isFlagEnabled && !!host;
  const queryClient = useQueryClient();
  const [deploymentId, setDeploymentId] = useState<string>();
  const [state, setState] = useState<AwsStackCallbackState>();

  const getLaunchStackParams = useCallback(
    async (rendered: TemplateRendered) => {
      const id = await host?.ensureOnboardingDeploymentId();
      if (!id) {
        throw new Error('No onboarding deployment for the stack to report to');
      }
      const { stackParams } = await sendStartAwsStackCallback(id, {
        connectorName: connectorName.trim() || undefined,
        accountType,
        iac_key: rendered.key,
        iac_blueprint_id: rendered.blueprintId,
        iac_blueprint_version: rendered.blueprintVersion,
      });
      setDeploymentId(id);
      setState({ status: 'waiting' });
      return stackParams;
    },
    [host, connectorName, accountType]
  );

  /** Stops following the stack, e.g. once the user created the identity by hand. */
  const reset = useCallback(() => {
    setDeploymentId(undefined);
    setState(undefined);
  }, []);

  const isPending = isPendingStatus(state?.status);
  useEffect(() => {
    if (!deploymentId || !isPending) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // Chained rather than an interval: a check that creates the identity can outlast the interval.
    const poll = async () => {
      try {
        const next = await sendGetAwsStackCallback(deploymentId);
        if (cancelled) {
          return;
        }
        setState(next);
        if (!isPendingStatus(next.status)) {
          return;
        }
      } catch {
        // A missed check only delays the result.
      }
      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deploymentId, isPending]);

  const createdId = state?.status === 'completed' ? state.connectorId : undefined;
  const createdName = state?.connectorName;
  useEffect(() => {
    if (!createdId) {
      return;
    }
    queryClient.invalidateQueries(['get-cloud-connectors']);
    onConnectorCreated({ id: createdId, name: createdName });
    reset();
  }, [createdId, createdName, onConnectorCreated, queryClient, reset]);

  return {
    isEnabled,
    getLaunchStackParams: isEnabled ? getLaunchStackParams : undefined,
    state,
    reset,
  };
};
