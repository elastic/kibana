/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { BASE_TRIGGERS_ACTIONS_UI_API_PATH } from '../../../constants';
import type { UiConfig } from '.';

export const fetchUiConfig = async ({ http }: { http: HttpStart }): Promise<UiConfig> => {
  return http.get<UiConfig>(`${BASE_TRIGGERS_ACTIONS_UI_API_PATH}/_config`);
};
