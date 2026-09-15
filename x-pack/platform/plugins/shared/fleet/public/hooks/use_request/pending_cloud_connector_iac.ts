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

export const persistPendingCloudConnectorIac = async ({
  policyName,
  cloudConnectorId,
}: {
  policyName?: string;
  cloudConnectorId?: string | null;
}): Promise<void> => {
  if (!cloudConnectorId || !policyName) {
    return;
  }
  const iac = pendingByPolicyName.get(policyName);
  if (!iac || !hasPendingIacConfirm(iac)) {
    return;
  }
  // Policy save already succeeded; a failed IAC write must not fail the save.
  // Keep the pending payload so a later save can retry.
  try {
    const { error } = await sendUpdateCloudConnector(cloudConnectorId, iac);
    if (error) {
      return;
    }
  } catch {
    return;
  }
  if (pendingByPolicyName.get(policyName) === iac) {
    pendingByPolicyName.delete(policyName);
  }
};
