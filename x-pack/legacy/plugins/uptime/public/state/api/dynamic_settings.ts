/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { isRight } from 'fp-ts/lib/Either';
import { getApiPath } from '../../lib/helper';
import {
  DynamicSettingsType,
  DynamicSettings,
  DynamicSettingsSaveResponse,
  DynamicSettingsSaveType,
} from '../../../common/runtime_types';

interface BaseApiRequest {
  basePath: string;
}

type SaveApiRequest = BaseApiRequest & {
  settings: DynamicSettings;
};

const plainApiPath = '/api/uptime/dynamic_settings';

export const fetchDynamicSettings = async ({
  basePath,
}: BaseApiRequest): Promise<DynamicSettings> => {
  const url = getApiPath(plainApiPath, basePath);
  const response = await fetch(url);
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

export const setDynamicSettings = async ({
  basePath,
  settings,
}: SaveApiRequest): Promise<DynamicSettingsSaveResponse> => {
  console.log("DO THE API");
  const url = getApiPath(plainApiPath, basePath);
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  const decoded = DynamicSettingsSaveType.decode(responseData);
  ThrowReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw new Error('`setDynamicSettings` response did not correspond to expected type');
};
