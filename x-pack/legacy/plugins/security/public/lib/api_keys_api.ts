/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
import { ApiKey, ApiKeyToInvalidate } from '../../common/model/api_key';
import { INTERNAL_API_BASE_PATH } from '../../common/constants';

interface CheckPrivilegesResponse {
  areApiKeysEnabled: boolean;
  isAdmin: boolean;
}

interface InvalidateApiKeysResponse {
  itemsInvalidated: ApiKeyToInvalidate[];
  errors: any[];
}

interface GetApiKeysResponse {
  apiKeys: ApiKey[];
}

const apiKeysUrl = `${INTERNAL_API_BASE_PATH}/api_key`;

export class ApiKeysApi {
  public static async checkPrivileges(): Promise<CheckPrivilegesResponse> {
    return kfetch({ pathname: `${apiKeysUrl}/privileges` });
  }

  public static async getApiKeys(isAdmin: boolean = false): Promise<GetApiKeysResponse> {
    const query = {
      isAdmin,
    };

    return kfetch({ pathname: apiKeysUrl, query });
  }

  public static async invalidateApiKeys(
    apiKeys: ApiKeyToInvalidate[],
    isAdmin: boolean = false
  ): Promise<InvalidateApiKeysResponse> {
    const pathname = `${apiKeysUrl}/invalidate`;
    const body = JSON.stringify({ apiKeys, isAdmin });
    return kfetch({ pathname, method: 'POST', body });
  }
}
