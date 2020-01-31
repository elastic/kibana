/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { isRight } from 'fp-ts/lib/Either';
import { getApiPath } from '../../lib/helper';
import { DynamicSettingsType, DynamicSettings } from '../../../common/runtime_types';

interface ApiRequest {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

export const fetchDynamicSettings = async ({ basePath }: ApiRequest): Promise<DynamicSettings> => {
  const url = getApiPath(`/api/uptime/dynamic_settings`, basePath);
  const response = await fetch(`${url}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  const decoded = DynamicSettingsType.decode(responseData);
  ThrowReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error('`getDynamicSettings` response did not correspond to expected type');
};
