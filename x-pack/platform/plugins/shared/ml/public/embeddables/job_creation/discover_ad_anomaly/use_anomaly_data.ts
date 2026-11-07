/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { SWIMLANE_TYPE } from '@kbn/ml-common-types/embeddables/swimlane_type';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import { useMlApi, useMlKibana } from '../../../application/contexts/kibana';
import { useMlJobService } from '../../../application/services/job_service';
import { AnomalyExplorerChartsService } from '../../../application/services/anomaly_explorer_charts_service';
import type {
  AnomaliesTableData,
  AppStateSelectedCells,
  ExplorerJob,
} from '../../../application/explorer/explorer_utils';
import {
  createJobs,
  getDateFormatTz,
  loadAnomaliesTableData,
} from '../../../application/explorer/explorer_utils';
import { OVERALL_LABEL } from '../../../application/explorer/explorer_constants';
import type { ExplorerChartsData } from '../../../application/explorer/explorer_charts/explorer_charts_container_service';

// As many as the Anomaly Explorer shows for a selected cell
const MAX_CHARTS = 6;
// Not aggregated by hour or day, which would keep only the highest scoring anomaly of each, so all of the bucket's are shown
const TABLE_INTERVAL = 'second';

export interface AnomalyData {
  isLoading: boolean;
  error?: string;
  jobs?: ExplorerJob[];
  tableData?: AnomaliesTableData;
  chartsData?: ExplorerChartsData;
}

/**
 * Loads the anomaly charts and table the Anomaly Explorer shows when a cell of the overall
 * swim lane is selected, for the job and time range of an anomaly. It waits for the width of the charts.
 */
export const useAnomalyData = ({
  jobId,
  timestamp,
  endTimestamp,
  chartWidth,
  severity,
}: {
  jobId: string;
  /** Start of the time range, in epoch ms */
  timestamp: number;
  /** End of the time range, in epoch ms */
  endTimestamp: number;
  /** Width of the area for the charts, which are not loaded until it is known */
  chartWidth: number;
  /** The severities of the anomalies to load, which the Anomaly Explorer defaults to all of */
  severity: SeverityThreshold[];
}): AnomalyData => {
  const mlApi = useMlApi();
  const mlJobService = useMlJobService();
  const {
    services: {
      uiSettings,
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  const anomalyExplorerService = useMemo(
    () => new AnomalyExplorerChartsService(timefilter, mlApi),
    [timefilter, mlApi]
  );
  const [anomalyData, setAnomalyData] = useState<AnomalyData>({ isLoading: true });

  useEffect(() => {
    if (!chartWidth) {
      return;
    }

    let isCurrent = true;
    setAnomalyData({ isLoading: true });

    const load = async (): Promise<AnomalyData> => {
      const { min, max } = timefilter.getBounds();
      if (!min || !max) {
        throw new Error('The time range of the chart is not defined.');
      }

      await mlJobService.loadJobsWrapper();
      const jobs = createJobs(await anomalyExplorerService.getCombinedJobs([jobId]));

      const selectedCells: AppStateSelectedCells = {
        type: SWIMLANE_TYPE.OVERALL,
        lanes: [OVERALL_LABEL],
        times: [timestamp / 1000, endTimestamp / 1000],
      };

      const [tableData, chartsData] = await Promise.all([
        loadAnomaliesTableData(
          mlApi,
          mlJobService,
          selectedCells,
          jobs,
          getDateFormatTz(uiSettings),
          { min, max },
          OVERALL_LABEL,
          TABLE_INTERVAL,
          { val: severity }
        ),
        lastValueFrom(
          anomalyExplorerService.getAnomalyData$(
            [jobId],
            chartWidth,
            timestamp,
            endTimestamp,
            severity,
            undefined,
            [],
            MAX_CHARTS
          )
        ),
      ]);
      return { isLoading: false, jobs, tableData, chartsData };
    };

    load()
      .then((loaded) => isCurrent && setAnomalyData(loaded))
      .catch((error) => {
        if (isCurrent) {
          setAnomalyData({ isLoading: false, error: extractErrorMessage(error) });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    mlApi,
    mlJobService,
    anomalyExplorerService,
    timefilter,
    uiSettings,
    jobId,
    timestamp,
    endTimestamp,
    chartWidth,
    severity,
  ]);

  return anomalyData;
};
