/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { INTERNAL_BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';

export interface DynamicConnectorType {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export const fetchDynamicConnectorTypes = ({ http }: { http: HttpSetup }) =>
  http.get<DynamicConnectorType[]>(`${INTERNAL_BASE_ACTION_API_PATH}/connector_types/dynamic`);

export const fetchDynamicConnectorTypeDefinition = ({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}) =>
  http.get<CreateConnectorTypeRequest>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/${encodeURIComponent(id)}/definition`
  );

export const updateDynamicConnectorTypeEditable = ({
  http,
  id,
  displayName,
  description,
  icon,
  test,
}: {
  http: HttpSetup;
  id: string;
  displayName: string;
  description: string;
  icon?: string;
  test?: NonNullable<CreateConnectorTypeRequest['test']>;
}) =>
  http.put<{ id: string }>(
    `${INTERNAL_BASE_ACTION_API_PATH}/connector_types/${encodeURIComponent(id)}/editable`,
    {
      body: JSON.stringify({
        displayName,
        description,
        ...(icon ? { icon } : {}),
        testEnabled: Boolean(test),
        test,
      }),
    }
  );
