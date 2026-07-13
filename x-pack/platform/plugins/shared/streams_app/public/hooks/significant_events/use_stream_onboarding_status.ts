/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import {
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { RUNNING_POLL_INTERVAL_MS } from '../../components/significant_events/constants';
import { useOnboardingApi } from '../use_onboarding_api';

export const useStreamOnboardingStatus = (streamName: string) => {
  const { getOnboardingStatus } = useOnboardingApi();

  const { data } = useQuery<SignificantEventsWorkflowStatusResult, Error>({
    queryKey: ['streamOnboardingStatus', streamName],
    queryFn: () => getOnboardingStatus(streamName),
    refetchInterval: (result) => {
      const status = result?.status;
      if (status && KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(status)) {
        return RUNNING_POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  return data;
};
