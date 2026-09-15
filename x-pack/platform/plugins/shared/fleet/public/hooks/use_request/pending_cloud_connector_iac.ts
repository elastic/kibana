/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_CONNECTOR_IAC_REQUEST_KEYS,
  type CloudConnectorIacState,
} from '../../../common/types/models/cloud_connector';

import { sendUpdateCloudConnector } from './cloud_connector';

const pendingByPolicyName = new Map<string, CloudConnectorIacState>();

/** Options the policy save helpers forward so a caller can surface a failed provenance write. */
export interface CloudConnectorIacPersistOptions {
  /**
   * Called when the policy saved but its cloud connector could not record the template
   * provenance; the payload is kept so the next save of the same policy retries.
   */
  onIacPersistError?: (error: Error) => void;
}

export const hasPendingIacConfirm = (iac: CloudConnectorIacState | undefined): boolean =>
  Boolean(iac && CLOUD_CONNECTOR_IAC_REQUEST_KEYS.some((key) => iac[key] !== undefined));

/**
 * Holds confirm-time IaC for a package policy until it is saved, then
 * written onto that policy's cloud connector SO.
 */
export const setPendingCloudConnectorIac = (
  policyName: string,
  iac?: CloudConnectorIacState
): void => {
  if (!policyName) {
    return;
  }
  if (!iac) {
    pendingByPolicyName.delete(policyName);
    return;
  }
  pendingByPolicyName.set(policyName, iac);
};

export const takePendingCloudConnectorIac = (
  policyName?: string
): CloudConnectorIacState | undefined => {
  if (!policyName) {
    return undefined;
  }
  const value = pendingByPolicyName.get(policyName);
  pendingByPolicyName.delete(policyName);
  return value;
};

const toError = (thrown: unknown): Error =>
  thrown instanceof Error ? thrown : new Error(String(thrown));

export const persistPendingCloudConnectorIac = async ({
  policyName,
  cloudConnectorId,
  onError,
}: {
  policyName?: string;
  cloudConnectorId?: string | null;
  onError?: (error: Error) => void;
}): Promise<void> => {
  if (!cloudConnectorId || !policyName) {
    return;
  }
  const iac = pendingByPolicyName.get(policyName);
  if (!iac || !hasPendingIacConfirm(iac)) {
    return;
  }
  // Policy save already succeeded; a failed IAC write must not fail the save.
  // Keep the pending payload so a later save can retry, and tell the caller
  // so the user learns the identity is missing its template provenance.
  let failure: Error | undefined;
  try {
    const { error } = await sendUpdateCloudConnector(cloudConnectorId, iac);
    if (error) {
      failure = error;
    }
  } catch (thrown) {
    failure = toError(thrown);
  }
  if (failure) {
    // Called exactly once, outside the write's try/catch; a throwing handler
    // must not escape and fail the already-successful save either.
    try {
      onError?.(failure);
    } catch {
      // The toast is best-effort; nothing else can be done here.
    }
    return;
  }
  if (pendingByPolicyName.get(policyName) === iac) {
    pendingByPolicyName.delete(policyName);
  }
};
