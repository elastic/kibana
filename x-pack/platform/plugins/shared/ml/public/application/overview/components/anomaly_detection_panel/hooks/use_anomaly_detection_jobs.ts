/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { MlSummaryJobs } from '../../../../../../common/types/anomaly_detection_jobs';
import type { GroupsDictionary } from '../anomaly_detection_panel';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { useMlApi } from '../../../../contexts/kibana';

export const useAnomalyDetectionJobs = (
  anomalyTimelineService: any,
  showNodeInfo: boolean,
  setLazyJobCount: (count: number) => void
) => {
  const mlApi = useMlApi();
  const { displayErrorToast } = useToastNotificationService();

  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<GroupsDictionary>({});
  const [groupsCount, setGroupsCount] = useState<number>(0);
  const [statsBarData, setStatsBarData] = useState<Array<{ label: string; value: number }>>();
  const [restStatsBarData, setRestStatsBarData] =
    useState<Array<{ label: string; value: number }>>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const loadJobs = useCallback(async () => {
    setIsLoading(true);

    const lazyJobCount = 0;
    try {
      const jobsResult: MlSummaryJobs = await mlApi.jobs.jobsSummary([]);
    } catch (e) {
      setErrorMessage(e.message !== undefined ? e.message : JSON.stringify(e));
      setIsLoading(false);
    }
  }, [mlApi.jobs]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return {
    isLoading,
    groups,
    groupsCount,
    statsBarData,
    restStatsBarData,
    errorMessage,
    loadJobs,
  };
};
