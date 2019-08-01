/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, Fragment } from 'react';

import { EuiPage, EuiPageBody, EuiPageContentBody } from '@elastic/eui';
import { Wizard } from './wizard';
import {
  jobCreatorFactory,
  isSingleMetricJobCreator,
  isPopulationJobCreator,
} from '../../common/job_creator';
import {
  JOB_TYPE,
  DEFAULT_MODEL_MEMORY_LIMIT,
  DEFAULT_BUCKET_SPAN,
} from '../../common/job_creator/util/constants';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { JobValidator } from '../../common/job_validator';
import { KibanaContext, isKibanaContext } from '../../../../data_frame/common/kibana_context';
import { getTimeFilterRange } from '../../../../components/full_time_range_selector';
import { MlTimeBuckets } from '../../../../util/ml_time_buckets';
import { newJobDefaults } from '../../../new_job/utils/new_job_defaults';
import { ExistingJobsAndGroups, mlJobService } from '../../../../services/job_service';
import { expandCombinedJobConfig } from '../../common/job_creator/configs';

const PAGE_WIDTH = 1200; // document.querySelector('.single-metric-job-container').width();
const BAR_TARGET = PAGE_WIDTH > 2000 ? 1000 : PAGE_WIDTH / 2;
const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target

export interface PageProps {
  existingJobsAndGroups: ExistingJobsAndGroups;
  jobType: JOB_TYPE;
}

export const Page: FC<PageProps> = ({ existingJobsAndGroups, jobType }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const jobDefaults = newJobDefaults();

  const jobCreator = jobCreatorFactory(jobType)(
    kibanaContext.currentIndexPattern,
    kibanaContext.currentSavedSearch,
    kibanaContext.combinedQuery
  );

  const { from, to } = getTimeFilterRange();
  jobCreator.setTimeRange(from, to);

  if (mlJobService.currentJob !== undefined) {
    const clonedJob = mlJobService.cloneJob(mlJobService.currentJob);
    const { job, datafeed } = expandCombinedJobConfig(clonedJob);
    jobCreator.cloneFromExistingJob(job, datafeed);
  } else {
    jobCreator.bucketSpan = DEFAULT_BUCKET_SPAN;

    if (isPopulationJobCreator(jobCreator) === true) {
      // for population jobs use the default mml (1GB)
      jobCreator.modelMemoryLimit = jobDefaults.anomaly_detectors.model_memory_limit;
    } else {
      // for all other jobs, use 10MB
      jobCreator.modelMemoryLimit = DEFAULT_MODEL_MEMORY_LIMIT;
    }

    if (isSingleMetricJobCreator(jobCreator) === true) {
      jobCreator.modelPlot = true;
    }
  }

  const chartInterval = new MlTimeBuckets();
  chartInterval.setBarTarget(BAR_TARGET);
  chartInterval.setMaxBars(MAX_BARS);
  chartInterval.setInterval('auto');

  const chartLoader = new ChartLoader(
    kibanaContext.currentIndexPattern,
    kibanaContext.currentSavedSearch,
    kibanaContext.combinedQuery
  );

  const jobValidator = new JobValidator(jobCreator, existingJobsAndGroups);

  const resultsLoader = new ResultsLoader(jobCreator, chartInterval, chartLoader);

  useEffect(() => {
    return () => {
      jobCreator.forceStopRefreshPolls();
      mlJobService.currentJob = undefined;
    };
  });

  return (
    <Fragment>
      <EuiPage style={{ backgroundColor: '#FFF' }}>
        <EuiPageBody>
          <EuiPageContentBody>
            <Wizard
              jobCreator={jobCreator}
              chartLoader={chartLoader}
              resultsLoader={resultsLoader}
              chartInterval={chartInterval}
              jobValidator={jobValidator}
              existingJobsAndGroups={existingJobsAndGroups}
            />
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
