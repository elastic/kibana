/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRequest } from '@kbn/es-ui-shared-plugin/public';
import { API_BASE_PATH } from '../../../common/constants';
import { useAppContext } from '../contexts/app_context';

interface ReturnValue {
  hasIndices: boolean;
}

export const useHasIndices = () => {
  const { http } = useAppContext();
  return useRequest<ReturnValue>(http, {
    path: `${API_BASE_PATH}/has_indices`,
    method: 'get',
  });
};
