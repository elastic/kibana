/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, Fragment } from 'react';

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
import { useKibanaContext } from '../../../../contexts/kibana';
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
  const kibanaContext = useKibanaContext();

  const jobDefaults = newJobDefaults();

  const jobCreator = jobCreatorFactory(jobType)(
    kibanaContext.currentIndexPattern,
    kibanaContext.currentSavedSearch,
    kibanaContext.combinedQuery
  );

  const { from, to } = getTimeFilterRange();
  jobCreator.setTimeRange(from, to);

  let skipTimeRangeStep = false;

  if (mlJobService.tempJobCloningObjects.job !== undefined) {
    const clonedJob = mlJobService.cloneJob(mlJobService.tempJobCloningObjects.job);
    const { job, datafeed } = expandCombinedJobConfig(clonedJob);
    jobCreator.cloneFromExistingJob(job, datafeed);

    skipTimeRangeStep = mlJobService.tempJobCloningObjects.skipTimeRangeStep;
    // if we're not skipping the time range, this is a standard job clone, so wipe the jobId
    if (skipTimeRangeStep === false) {
      jobCreator.jobId = '';
    }

    mlJobService.tempJobCloningObjects.skipTimeRangeStep = false;
    mlJobService.tempJobCloningObjects.job = undefined;

    if (
      mlJobService.tempJobCloningObjects.start !== undefined &&
      mlJobService.tempJobCloningObjects.end !== undefined
    ) {
      // auto select the start and end dates for the time range picker
      jobCreator.setTimeRange(
        mlJobService.tempJobCloningObjects.start,
        mlJobService.tempJobCloningObjects.end
      );
      mlJobService.tempJobCloningObjects.start = undefined;
      mlJobService.tempJobCloningObjects.end = undefined;
    }
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

    if (kibanaContext.currentSavedSearch.id !== undefined) {
      // Jobs created from saved searches cannot be cloned in the wizard as the
      // ML job config holds no reference to the saved search ID.
      jobCreator.createdBy = null;
    }
  }

  const chartInterval = new MlTimeBuckets();
  chartInterval.setBarTarget(BAR_TARGET);
  chartInterval.setMaxBars(MAX_BARS);
  chartInterval.setInterval('auto');

  const chartLoader = new ChartLoader(
    kibanaContext.currentIndexPattern,
    kibanaContext.combinedQuery
  );

  const jobValidator = new JobValidator(jobCreator, existingJobsAndGroups);

  const resultsLoader = new ResultsLoader(jobCreator, chartInterval, chartLoader);

  useEffect(() => {
    return () => {
      jobCreator.forceStopRefreshPolls();
    };
  });

  return (
    <Fragment>
      <EuiPage style={{ backgroundColor: 'inherit' }} data-test-subj="mlPageJobWizard">
        <EuiPageBody>
          <EuiPageContentBody>
            <Wizard
              jobCreator={jobCreator}
              chartLoader={chartLoader}
              resultsLoader={resultsLoader}
              chartInterval={chartInterval}
              jobValidator={jobValidator}
              existingJobsAndGroups={existingJobsAndGroups}
              skipTimeRangeStep={skipTimeRangeStep}
            />
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
