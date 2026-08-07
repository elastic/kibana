/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import {
  validateVaultAddress,
  encodeVaultPathSegments,
} from '@kbn/connector-specs/src/specs/hashicorp_vault/path_utils';
import { request } from './axios_utils';
import type { ActionsConfigurationUtilities } from '../actions_config';

const VAULT_NAMESPACE_HEADER = 'X-Vault-Namespace';

export interface VaultAppRoleLoginResult {
  clientToken: string;
  leaseDurationSec: number;
}

export interface RequestVaultAppRoleLoginOpts {
  address: string;
  namespace?: string;
  mountPath: string;
  roleId: string;
  secretId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
}

const getVaultErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/**
 * Performs a Vault AppRole login (https://developer.hashicorp.com/vault/api-docs/auth/approle#login-with-approle)
 * and returns the issued client token + lease duration.
 *
 * Never forwards the underlying Axios error's message or response body: Vault error
 * responses are a JSON `{ errors: [...] }` envelope that this function doesn't
 * control the contents of, so -- consistent with `.hashicorp_vault`'s own
 * error-construction discipline (guarantee 4a in the connector-provisioning plan)
 * -- only the HTTP status code is surfaced.
 */
export async function requestVaultAppRoleLogin({
  address,
  namespace,
  mountPath,
  roleId,
  secretId,
  logger,
  configurationUtilities,
}: RequestVaultAppRoleLoginOpts): Promise<VaultAppRoleLoginResult> {
  const origin = validateVaultAddress(address);
  const encodedMountPath = encodeVaultPathSegments(mountPath, 'mountPath');
  const url = `${origin}/v1/auth/${encodedMountPath}/login`;

  let response;
  try {
    response = await request({
      axios: axios.create(),
      url,
      method: 'post',
      logger,
      data: { role_id: roleId, secret_id: secretId },
      headers: namespace ? { [VAULT_NAMESPACE_HEADER]: namespace } : undefined,
      configurationUtilities,
    });
  } catch (error) {
    const status = getVaultErrorStatus(error);
    throw new Error(
      `Failed to authenticate to Vault via AppRole${
        status ? ` (HTTP ${status})` : ''
      }. Check the address, mount path, role ID, and secret ID.`
    );
  }

  const auth = (response.data as { auth?: { client_token?: unknown; lease_duration?: unknown } })
    ?.auth;
  const clientToken = auth?.client_token;
  const leaseDurationSec = auth?.lease_duration;

  if (typeof clientToken !== 'string' || clientToken.length === 0) {
    throw new Error(
      'Unexpected response from Vault AppRole login: missing or empty auth.client_token.'
    );
  }

  return {
    clientToken,
    leaseDurationSec: typeof leaseDurationSec === 'number' ? leaseDurationSec : 0,
  };
}
