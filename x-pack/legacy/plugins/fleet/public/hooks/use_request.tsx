/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  UseRequestConfig,
  useRequest as _useRequest,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../src/plugins/es_ui_shared/public/request/np_ready_request';
import { useLibs } from './';

export const useRequest = (config: UseRequestConfig) => {
  const { httpClient } = useLibs();
  // @ts-ignore
  return _useRequest(httpClient, config);
};
