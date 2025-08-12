/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { i18n } from '@kbn/i18n';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useTimefilter } from '@kbn/ml-date-picker';
import { ML_JOB_ID } from '@kbn/ml-anomaly-utils';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { useMlKibana } from '../../../contexts/kibana';

import type { MlJobWithTimeRange } from '../../../../../common/types/anomaly_detection_jobs';
import { useRefresh } from '../../use_refresh';
import { Explorer } from '../../../explorer';
import { useExplorerData } from '../../../explorer/actions';
import { useJobSelection } from '../../../components/job_selector/use_job_selection';
import { useTableSeverity } from '../../../components/controls/select_severity';
import { MlPageHeader } from '../../../components/page_header';
import { PageTitle } from '../../../components/page_title';
import { AnomalyResultsViewSelector } from '../../../components/anomaly_results_view_selector';
import { AnomalyDetectionEmptyState } from '../../../jobs/jobs_list/components/anomaly_detection_empty_state';
import { useAnomalyExplorerContext } from '../../../explorer/anomaly_explorer_context';
import { getInfluencers } from '../../../explorer/explorer_utils';
import { useMlJobService } from '../../../services/job_service';
import type { ExplorerState } from '../../../explorer/explorer_data';
import { getExplorerDefaultState } from '../../../explorer/explorer_data';
import type { LoadExplorerDataConfig } from '../../../explorer/actions/load_explorer_data';

export interface ExplorerUrlStateManagerProps {
  jobsWithTimeRange: MlJobWithTimeRange[];
}

export const ExplorerUrlStateManager: FC<ExplorerUrlStateManagerProps> = ({
  jobsWithTimeRange,
}) => {
  const {
    services: { cases, uiSettings, mlServices },
  } = useMlKibana();
  const { mlApi } = mlServices;

  const [stoppedPartitions, setStoppedPartitions] = useState<string[] | undefined>();

  const timeBuckets = useTimeBuckets(uiSettings);
  const timefilter = useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });
  const mlJobService = useMlJobService();
  const { selectedIds: jobIds, selectedJobs } = useJobSelection(jobsWithTimeRange);
  const noInfluencersConfigured = getInfluencers(mlJobService, selectedJobs).length === 0;

  const selectedJobsRunning = jobsWithTimeRange.some(
    (job) => jobIds?.includes(job.id) && job.isRunning === true
  );

  const anomalyExplorerContext = useAnomalyExplorerContext();
  const [explorerState, setExplorerState] = useState<ExplorerState>(getExplorerDefaultState());

  const refresh = useRefresh();
  const lastRefresh = refresh?.lastRefresh ?? 0;

  const getJobsWithStoppedPartitions = useCallback(async (selectedJobIds: string[]) => {
    try {
      const fetchedStoppedPartitions = await mlApi.results.getCategoryStoppedPartitions(
        selectedJobIds,
        ML_JOB_ID
      );
      if (
        fetchedStoppedPartitions &&
        Array.isArray(fetchedStoppedPartitions.jobs) &&
        fetchedStoppedPartitions.jobs.length > 0
      ) {
        setStoppedPartitions(fetchedStoppedPartitions.jobs);
      } else {
        setStoppedPartitions(undefined);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (jobIds && jobIds.length > 0) {
      getJobsWithStoppedPartitions(jobIds);
    }
  }, [getJobsWithStoppedPartitions, jobIds]);

  const [explorerData, loadExplorerData] = useExplorerData();

  useEffect(() => {
    if (explorerData !== undefined && Object.keys(explorerData).length > 0) {
      setExplorerState((prevState) => ({ ...prevState, ...explorerData }));
    }
  }, [explorerData]);

  const [tableSeverity] = useTableSeverity();

  const showCharts = useObservable(
    anomalyExplorerContext.chartsStateService.getShowCharts$(),
    anomalyExplorerContext.chartsStateService.getShowCharts()
  );

  const selectedCells = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getSelectedCells$(),
    anomalyExplorerContext.anomalyTimelineStateService.getSelectedCells()
  );

  const viewByFieldName = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getViewBySwimlaneFieldName$()
  );

  const swimLaneSeverity = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getSwimLaneSeverity$(),
    anomalyExplorerContext.anomalyTimelineStateService.getSwimLaneSeverity()
  );

  const influencersFilterQuery = useObservable(
    anomalyExplorerContext.anomalyExplorerCommonStateService.influencerFilterQuery$
  );

  const loadExplorerDataConfig = useMemo(
    (): LoadExplorerDataConfig => ({
      lastRefresh,
      influencersFilterQuery: influencersFilterQuery!,
      noInfluencersConfigured,
      selectedCells,
      selectedJobs,
      viewBySwimlaneFieldName: viewByFieldName!,
    }),
    [
      lastRefresh,
      influencersFilterQuery,
      noInfluencersConfigured,
      selectedCells,
      selectedJobs,
      viewByFieldName,
    ]
  );

  useEffect(() => {
    if (!loadExplorerDataConfig || loadExplorerDataConfig?.selectedCells === undefined) return;
    // TODO: Find other way to set loading state as it causes unnecessary re-renders - handle it in anomaly_explorer_common_state
    setExplorerState((prevState) => ({ ...prevState, loading: true }));
    loadExplorerData(loadExplorerDataConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(loadExplorerDataConfig)]);

  const overallSwimlaneData = useObservable(
    anomalyExplorerContext.anomalyTimelineStateService.getOverallSwimLaneData$(),
    null
  );

  if (explorerState === undefined || refresh === undefined) {
    return null;
  }

  const CasesContext = cases?.ui.getCasesContext() ?? React.Fragment;

  const casesPermissions = cases?.helpers.canUseCases();

  return (
    <div className="ml-explorer">
      <MlPageHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <AnomalyResultsViewSelector viewId="explorer" selectedJobs={selectedJobs} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PageTitle
              title={i18n.translate('xpack.ml.explorer.pageTitle', {
                defaultMessage: 'Anomaly Explorer',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      <CasesContext owner={[]} permissions={casesPermissions!}>
        {jobsWithTimeRange.length === 0 ? (
          <AnomalyDetectionEmptyState showDocsLink />
        ) : (
          <Explorer
            {...{
              explorerState,
              noInfluencersConfigured,
              overallSwimlaneData,
              showCharts,
              severity: tableSeverity.val,
              stoppedPartitions,
              selectedJobsRunning,
              timeBuckets,
              timefilter,
              selectedCells,
              swimLaneSeverity,
            }}
          />
        )}
      </CasesContext>
    </div>
  );
};
