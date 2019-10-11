/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { API_BASE_PATH } from '../../../../common/constants';
import { UIM_TASK_LIST_LOAD } from '../../constants';
import { uiMetricService } from '../ui_metric';
import { useRequest } from './use_request';

export const useLoadTasks = () => {
  const result = useRequest({
    path: `${API_BASE_PATH}/tasks`,
    requestOptions: {
      method: 'get',
    },
  });

  const { trackUiMetric } = uiMetricService;
  trackUiMetric(UIM_TASK_LIST_LOAD);

  return result;
};
