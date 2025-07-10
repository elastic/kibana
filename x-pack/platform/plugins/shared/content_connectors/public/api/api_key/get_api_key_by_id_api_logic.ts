/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { APIKeyResponse } from '../../../common/types/api';
import { createApiLogic } from '../api_logic/create_api_logic';

export const getApiKeyById = async ({ id, http }: { id: string; http?: HttpSetup }) => {
  const route = `/internal/content_connectors/api_keys/${id}`;

  return await http?.get<APIKeyResponse>(route);
};

export const GetApiKeyByIdLogic = createApiLogic(['get_api_key_by_id_logic'], getApiKeyById);
