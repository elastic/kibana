/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { getExecuteConnectorUrl } from '../../../../common/utils/connectors_api';
import type { ConnectorExecutorResult } from '../rewrite_response_to_camel_case';
import { rewriteResponseToCamelCase } from '../rewrite_response_to_camel_case';
import type { Choice, ServiceNowField } from './types';

export const BASE_ACTION_API_PATH = '/api/actions';

export interface GetChoicesProps {
  http: HttpSetup;
  connectorId: string;
  fields: string[];
  signal?: AbortSignal;
}

export interface GetFieldsProps {
  http: HttpSetup;
  connectorId: string;
  signal?: AbortSignal;
}

/** Writable string fields of the incident table, with their labels. */
export async function getFields({ http, connectorId, signal }: GetFieldsProps) {
  const res = await http.post<ConnectorExecutorResult<ServiceNowField[]>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'getFields', subActionParams: {} },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}

export async function getChoices({ http, connectorId, fields, signal }: GetChoicesProps) {
  const res = await http.post<ConnectorExecutorResult<Choice[]>>(
    getExecuteConnectorUrl(connectorId),
    {
      body: JSON.stringify({
        params: { subAction: 'getChoices', subActionParams: { fields } },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}
