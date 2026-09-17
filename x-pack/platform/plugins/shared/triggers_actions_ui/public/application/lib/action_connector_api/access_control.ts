/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { buildPath } from '@kbn/core-http-browser';
import type { AccessControlInput } from '@kbn/entity-access-control';
import type {
  ConnectorAccessControlApiResponse,
  ConnectorAccessRole,
  ConnectorAccessUserProfile,
} from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';

const getPath = (id: string) =>
  buildPath(`${INTERNAL_BASE_ACTION_API_PATH}/connector/{id}/access_control`, { id });

const getSuggestPath = (id: string) =>
  buildPath(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector/{id}/access_control/_suggest_user_profiles`,
    {
      id,
    }
  );

export const loadConnectorAccessControl = async ({
  http,
  id,
  signal,
}: {
  http: HttpSetup;
  id: string;
  signal?: AbortSignal;
}): Promise<ConnectorAccessControlApiResponse> =>
  http.get<ConnectorAccessControlApiResponse>(getPath(id), { signal });

export const updateConnectorAccessControl = async ({
  http,
  id,
  accessControl,
}: {
  http: HttpSetup;
  id: string;
  accessControl: AccessControlInput<ConnectorAccessRole>;
}): Promise<void> => {
  await http.put(getPath(id), { body: JSON.stringify(accessControl) });
};

export const suggestConnectorUserProfiles = async ({
  http,
  id,
  name,
  signal,
}: {
  http: HttpSetup;
  id: string;
  name: string;
  signal?: AbortSignal;
}): Promise<ConnectorAccessUserProfile[]> =>
  http.post<ConnectorAccessUserProfile[]>(getSuggestPath(id), {
    body: JSON.stringify({ name, size: 20 }),
    signal,
  });
