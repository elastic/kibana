/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  sendCreateProvisioningCallback,
  sendDeleteProvisioningCallback,
  sendGetProvisioningCallback,
  useGetProvisioningCallbackAvailabilityQuery,
} from '../../../hooks/use_request/provisioning_callback';
import type {
  CloudConnectorCallback,
  CloudConnectorCallbackIdentity,
} from '../../../../common/types/models/provisioning_callback';
import type { AccountType } from '../../../../common/types/models/cloud_connector';
import { IAC_PROVISIONER_API_ROUTES } from '../../../../common/constants';

export const PROVISIONING_CALLBACK_POLL_INTERVAL_MS = 3_000;
/** Stop polling after this even if the record has not expired yet. */
export const PROVISIONING_CALLBACK_POLL_TIMEOUT_MS = 10 * 60 * 1000;
/** Extra time to wait when the deadline finds the stack's report still being applied. */
export const PROVISIONING_CALLBACK_RECEIVING_GRACE_MS = 60 * 1000;

/**
 * `receiving`: the stack has reported and the server is creating the identity. `deploying`: the
 * identity exists and the server is deploying the integrations of the attached onboarding
 * deployment; `created` is already set.
 */
export type ProvisioningCallbackClientStatus =
  | 'idle'
  | 'pending'
  | 'receiving'
  | 'deploying'
  | 'received'
  | 'expired'
  | 'error';

/** How the server-side deploy of the attached onboarding deployment ended. */
export interface ProvisioningCallbackDeployOutcome {
  status: 'deployed' | 'failed';
  onboardingDeploymentId: string;
  error?: string;
}

/**
 * What `cancel` found. `cancelled`: nothing will arrive, the caller may create by hand.
 * `created`: the stack reported first; its identity is (or will be) in `created`. `failed`: the
 * record could not be retired and is still live; the caller must not create by hand yet.
 */
export type ProvisioningCallbackCancelOutcome = 'cancelled' | 'created' | 'failed';

/** The cloud connector created when the stack reported back, with the ARNs it reported. */
export interface CloudConnectorCallbackCreated {
  id: string;
  name: string;
  role_arn?: string;
  stack_arn?: string;
}

/** Identity details stored on the record at launch and used to create the cloud connector. */
export interface CloudConnectorCallbackStartInput {
  connectorName?: string;
  accountType?: AccountType;
  iacKey?: string | null;
  iacBlueprintId?: string | null;
  iacBlueprintVersion?: string | null;
  /** Onboarding deployment whose stored policies the server deploys once the stack reports. */
  onboardingDeploymentId?: string;
}

export interface UseProvisioningCallbackResult {
  /**
   * False when the callback can't be used: disabled, still being checked, or Kibana's public URL
   * is not one a launched stack could report back to.
   */
  available: boolean;
  /** True while the server is checking whether its public URL can be called back. */
  isChecking: boolean;
  /** The server's explanation when the callback is not available. */
  unavailableReason?: string;
  status: ProvisioningCallbackClientStatus;
  /** Set when the stack's report has created the cloud connector. */
  created?: CloudConnectorCallbackCreated;
  /** Set once the deploy that follows the report has finished, when a deployment was attached. */
  deployOutcome?: ProvisioningCallbackDeployOutcome;
  /**
   * Creates a callback record and returns the stack parameters for the quick-create link.
   * Rejects when the record could not be created: the stack's report is the only way the identity
   * gets created, so the caller must not open the console. Returns undefined when the callback is
   * not available.
   */
  start: (
    identity: CloudConnectorCallbackStartInput
  ) => Promise<Record<string, string> | undefined>;
  /**
   * Stops waiting on the current record and retires it on the server, so a late report cannot
   * create an identity the form no longer watches. See `ProvisioningCallbackCancelOutcome` for what the
   * caller may do next.
   */
  cancel: () => Promise<ProvisioningCallbackCancelOutcome>;
}

const toCreated = (item: CloudConnectorCallback): CloudConnectorCallbackCreated | undefined =>
  item.cloud_connector_id
    ? {
        id: item.cloud_connector_id,
        name: item.connector_name ?? item.cloud_connector_id,
        role_arn: item.role_arn,
        stack_arn: item.stack_arn,
      }
    : undefined;

const toIdentityBody = (
  identity: CloudConnectorCallbackStartInput
): CloudConnectorCallbackIdentity => {
  const body: CloudConnectorCallbackIdentity = {};
  const name = identity.connectorName?.trim();
  if (name) {
    body.connector_name = name;
  }
  if (identity.accountType) {
    body.account_type = identity.accountType;
  }
  if (identity.iacKey !== undefined) {
    body.iac_key = identity.iacKey;
  }
  if (identity.iacBlueprintId !== undefined) {
    body.iac_blueprint_id = identity.iacBlueprintId;
  }
  if (identity.iacBlueprintVersion !== undefined) {
    body.iac_blueprint_version = identity.iacBlueprintVersion;
  }
  if (identity.onboardingDeploymentId) {
    body.onboarding_deployment_id = identity.onboardingDeploymentId;
  }
  return body;
};

/** True while a received record still has a deploy running on the server. */
const isDeployRunning = (item: CloudConnectorCallback): boolean =>
  !!item.onboarding_deployment_id &&
  item.deploy_status !== 'deployed' &&
  item.deploy_status !== 'failed';

const toDeployOutcome = (
  item: CloudConnectorCallback
): ProvisioningCallbackDeployOutcome | undefined =>
  item.onboarding_deployment_id &&
  (item.deploy_status === 'deployed' || item.deploy_status === 'failed')
    ? {
        status: item.deploy_status,
        onboardingDeploymentId: item.onboarding_deployment_id,
        ...(item.deploy_error ? { error: item.deploy_error } : {}),
      }
    : undefined;

export const useProvisioningCallback = ({
  enabled,
}: {
  enabled: boolean;
}): UseProvisioningCallbackResult => {
  // The server decides whether the stack could call back: `server.publicBaseUrl` must be set and
  // be https. It is also the URL the stack is given.
  const {
    data: availability,
    isLoading: isChecking,
    refetch: recheckAvailability,
  } = useGetProvisioningCallbackAvailabilityQuery({ enabled });
  const kibanaUrl = availability?.available ? availability.kibana_url : undefined;
  const [status, setStatus] = useState<ProvisioningCallbackClientStatus>('idle');
  const [created, setCreated] = useState<CloudConnectorCallbackCreated | undefined>(undefined);
  const [deployOutcome, setDeployOutcome] = useState<ProvisioningCallbackDeployOutcome | undefined>(
    undefined
  );
  // The record whose server-side deploy is being watched; the deadline and cancel leave it alone.
  const deployingIdRef = useRef<string | undefined>(undefined);
  // The record currently being waited on; a poll result for any other id is stale and ignored.
  const activeIdRef = useRef<string | undefined>(undefined);
  // The record whose report was last seen, so a cancel racing with that poll knows the outcome.
  const receivedIdRef = useRef<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // `start` awaits the create request; don't poll a record created after the form unmounted.
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  /** True once a later Launch has replaced `id` as the record being waited on. */
  const isSuperseded = (id: string) =>
    activeIdRef.current !== undefined && activeIdRef.current !== id;

  /**
   * Retires the record on the server. Settles the hook when the answer is final: a received
   * report is surfaced, a cancelled or missing record stops the wait. The caller sets the status
   * for a cancelled record, since it means expired at the deadline and idle on a manual cancel.
   */
  const retire = useCallback(
    async (id: string): Promise<ProvisioningCallbackCancelOutcome> => {
      const { data, error } = await sendDeleteProvisioningCallback(id);
      if (activeIdRef.current !== id) {
        // A poll saw the report land while the request was in flight; otherwise a new Launch or
        // an unmount took the record away, and there is nothing left to wait on.
        return receivedIdRef.current === id ? 'created' : 'cancelled';
      }
      if (error && error.statusCode !== 404) {
        // The record is still live. Keep waiting rather than let a late report create a second
        // identity next to a manual one.
        return 'failed';
      }
      const item = data?.item;
      if (item?.status === 'receiving') {
        // The stack reported first and its identity is being made; the poll picks it up.
        setStatus('receiving');
        return 'created';
      }
      stopPolling();
      activeIdRef.current = undefined;
      if (item?.status === 'received') {
        receivedIdRef.current = id;
        setCreated(toCreated(item));
        setStatus('received');
        return 'created';
      }
      return 'cancelled';
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (id: string, expiresAt: string) => {
      let deadline = Math.min(
        new Date(expiresAt).getTime(),
        Date.now() + PROVISIONING_CALLBACK_POLL_TIMEOUT_MS
      );
      let hasGrace = true;
      let isRetiring = false;
      timerRef.current = setInterval(async () => {
        if (activeIdRef.current !== id) {
          return;
        }
        if (Date.now() > deadline && deployingIdRef.current !== id) {
          // The wait is over. Retire the record so a late report cannot create an identity the
          // form no longer watches, and so a manual Create does not have to.
          if (isRetiring) {
            return;
          }
          isRetiring = true;
          const outcome = await retire(id).finally(() => {
            isRetiring = false;
          });
          if (isSuperseded(id)) {
            // A new Launch is waiting on its own record; leave its state alone.
            return;
          }
          if (outcome === 'cancelled') {
            setStatus('expired');
          } else if (outcome === 'created' && activeIdRef.current === id) {
            // Still being applied. Give it a little longer, once.
            if (hasGrace) {
              hasGrace = false;
              deadline = Date.now() + PROVISIONING_CALLBACK_RECEIVING_GRACE_MS;
            } else {
              stopPolling();
              setStatus('expired');
            }
          } else if (outcome === 'failed') {
            // The record is still live; the id is kept so a manual Create retries the cancel.
            stopPolling();
            setStatus('expired');
          }
          return;
        }
        const { data, error } = await sendGetProvisioningCallback(id);
        if (activeIdRef.current !== id) {
          return;
        }
        if (error || !data) {
          // Transient failures keep polling; a missing record (e.g. 404) ends the wait.
          if (error?.statusCode === 404) {
            stopPolling();
            activeIdRef.current = undefined;
            setStatus('error');
          }
          return;
        }
        if (data.item.status === 'received') {
          receivedIdRef.current = id;
          setCreated(toCreated(data.item));
          if (isDeployRunning(data.item)) {
            // The identity exists; the server is now deploying the integrations. Keep watching,
            // with no deadline: the deploy cannot be cancelled and always ends.
            deployingIdRef.current = id;
            setStatus('deploying');
            return;
          }
          stopPolling();
          activeIdRef.current = undefined;
          deployingIdRef.current = undefined;
          setDeployOutcome(toDeployOutcome(data.item));
          setStatus('received');
        } else if (data.item.status === 'receiving') {
          setStatus('receiving');
        } else if (data.item.status === 'pending') {
          // A report the server gave up on hands the record back; the stack may try again.
          setStatus('pending');
        }
      }, PROVISIONING_CALLBACK_POLL_INTERVAL_MS);
    },
    [retire, stopPolling]
  );

  const cancel = useCallback(async (): Promise<ProvisioningCallbackCancelOutcome> => {
    const id = activeIdRef.current;
    if (!id) {
      return 'cancelled';
    }
    if (deployingIdRef.current === id) {
      // The identity is made and its integrations are being deployed; nothing to retire.
      return 'created';
    }
    const outcome = await retire(id);
    if (isSuperseded(id)) {
      return outcome;
    }
    if (outcome === 'cancelled') {
      // Cancelled, or already gone: nothing will arrive.
      setStatus('idle');
    } else if (outcome === 'created' && activeIdRef.current === id && !timerRef.current) {
      // The report is being applied and nothing is polling any more (the deadline had passed
      // and its cancel failed). Watch for the identity a little longer.
      setStatus('receiving');
      startPolling(
        id,
        new Date(Date.now() + PROVISIONING_CALLBACK_RECEIVING_GRACE_MS).toISOString()
      );
    }
    return outcome;
  }, [retire, startPolling]);

  const start = useCallback(
    async (identity: CloudConnectorCallbackStartInput) => {
      if (!enabled || !kibanaUrl) {
        return undefined;
      }
      // A new Launch supersedes whatever the previous one was waiting on, including a received one.
      // A record still being waited on is retired, so its stack cannot create an identity the
      // form no longer watches. Best effort: its key expires on its own otherwise.
      const previousId = activeIdRef.current;
      stopPolling();
      activeIdRef.current = undefined;
      setStatus('idle');
      if (previousId) {
        sendDeleteProvisioningCallback(previousId).catch(() => {});
      }

      const { data, error } = await sendCreateProvisioningCallback({
        provider: 'aws',
        ...toIdentityBody(identity),
      });
      if (error?.statusCode === 412) {
        // The server's public URL stopped being one a stack can report to; show its reason.
        recheckAvailability();
      }
      if (error || !data) {
        throw new Error(error?.message ?? 'The provisioning callback record could not be created');
      }
      if (!mountedRef.current) {
        return undefined;
      }
      activeIdRef.current = data.item.id;
      deployingIdRef.current = undefined;
      setCreated(undefined);
      setDeployOutcome(undefined);
      setStatus('pending');
      startPolling(data.item.id, data.item.expires_at);

      // The stack gets the complete URL to report to, so only Kibana knows the route. The token
      // travels in the quick-create link as a stack parameter. It is no credential: it admits
      // nothing but a report to this one record, expires with it, and the template hides it in
      // the AWS console.
      return {
        ElasticCallbackUrl: `${kibanaUrl}${IAC_PROVISIONER_API_ROUTES.CALLBACK_RECEIVE_PATTERN.replace(
          '{callbackId}',
          encodeURIComponent(data.item.id)
        )}`,
        ElasticCallbackToken: data.token,
      };
    },
    [enabled, kibanaUrl, recheckAvailability, stopPolling, startPolling]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      activeIdRef.current = undefined;
    };
  }, [stopPolling]);

  const available = enabled && kibanaUrl !== undefined;
  const unavailableReason =
    enabled && availability && !availability.available ? availability.reason : undefined;

  return {
    available,
    isChecking: enabled && isChecking,
    unavailableReason,
    status,
    created,
    deployOutcome,
    start,
    cancel,
  };
};
