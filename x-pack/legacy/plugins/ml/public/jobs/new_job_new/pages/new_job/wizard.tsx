/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useReducer, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiSteps, EuiStepStatus } from '@elastic/eui';
import { WIZARD_STEPS } from '../components/step_types';

import { TimeRangeStep } from '../components/time_range_step';

import { PickFieldsStep } from '../components/pick_fields_step';
import { JobDetailsStep } from '../components/job_details_step';
import { SummaryStep } from '../components/summary_step';
import { MlTimeBuckets } from '../../../../util/ml_time_buckets';

import {
  JobCreatorContext,
  JobCreatorContextValue,
  ExistingJobsAndGroups,
} from '../components/job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../data_frame/common/kibana_context';

import {
  SingleMetricJobCreator,
  MultiMetricJobCreator,
  PopulationJobCreator,
} from '../../common/job_creator';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { newJobCapsService } from '../../../../services/new_job_capabilities_service';

interface Props {
  jobCreator: SingleMetricJobCreator | MultiMetricJobCreator | PopulationJobCreator;
  chartLoader: ChartLoader;
  resultsLoader: ResultsLoader;
  chartInterval: MlTimeBuckets;
  existingJobsAndGroups: ExistingJobsAndGroups;
}

export const Wizard: FC<Props> = ({
  jobCreator,
  chartLoader,
  resultsLoader,
  chartInterval,
  existingJobsAndGroups,
}) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const [jobCreatorUpdated, jobCreatorUpdate] = useReducer<(s: number) => number>(s => s + 1, 0);

  const jobCreatorContext: JobCreatorContextValue = {
    jobCreatorUpdated,
    jobCreatorUpdate,
    jobCreator,
    chartLoader,
    resultsLoader,
    chartInterval,
    fields: newJobCapsService.fields,
    aggs: newJobCapsService.aggs,
    existingJobsAndGroups,
  };

  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.TIME_RANGE);

  const stepsConfig = [
    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.definePivotStepTitle', {
        defaultMessage: 'Time range',
      }),
      children: (
        <TimeRangeStep
          isCurrentStep={currentStep === WIZARD_STEPS.TIME_RANGE}
          setCurrentStep={setCurrentStep}
        />
      ),
      status: currentStep >= WIZARD_STEPS.TIME_RANGE ? undefined : ('incomplete' as EuiStepStatus),
    },
    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.definePivotStepTitle', {
        defaultMessage: 'Pick fields',
      }),
      children: (
        <PickFieldsStep
          isCurrentStep={currentStep === WIZARD_STEPS.PICK_FIELDS}
          setCurrentStep={setCurrentStep}
        />
      ),
      status: currentStep >= WIZARD_STEPS.PICK_FIELDS ? undefined : ('incomplete' as EuiStepStatus),
    },

    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.definePivotStepTitle', {
        defaultMessage: 'Job details',
      }),
      children: (
        <JobDetailsStep
          isCurrentStep={currentStep === WIZARD_STEPS.JOB_DETAILS}
          setCurrentStep={setCurrentStep}
        />
      ),
      status: currentStep >= WIZARD_STEPS.JOB_DETAILS ? undefined : ('incomplete' as EuiStepStatus),
    },

    {
      title: i18n.translate('xpack.ml.dataframe.transformsWizard.definePivotStepTitle', {
        defaultMessage: 'Summary',
      }),
      children: (
        <SummaryStep
          isCurrentStep={currentStep === WIZARD_STEPS.SUMMARY}
          setCurrentStep={setCurrentStep}
        />
      ),
      status: currentStep >= WIZARD_STEPS.SUMMARY ? undefined : ('incomplete' as EuiStepStatus),
    },
  ];

  return (
    <JobCreatorContext.Provider value={jobCreatorContext}>
      <EuiSteps steps={stepsConfig} />
    </JobCreatorContext.Provider>
  );
};
