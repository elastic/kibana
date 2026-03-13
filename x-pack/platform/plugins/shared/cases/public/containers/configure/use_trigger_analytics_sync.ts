/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { triggerAnalyticsSync } from './api';
import { useCasesToast } from '../../common/use_cases_toast';
import type { ServerError } from '../../types';
import { casesQueriesKeys } from '../constants';
import * as i18n from './translations';

export const useTriggerAnalyticsSync = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useCasesToast();

  return useMutation((owner: string) => triggerAnalyticsSync(owner), {
    onSuccess: () => {
      // Refetch configure so the updated analytics_last_sync_at timestamp is displayed
      queryClient.invalidateQueries(casesQueriesKeys.configuration({}));
    },
    onError: (error: ServerError) => {
      showErrorToast(error, { title: i18n.ANALYTICS_SYNC_ERROR_TITLE });
    },
  });
};
