/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { JobCreatorContext } from '../job_creator_context';
import { WizardNav } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JOB_TYPE } from '../../../../../../../common/constants/new_job';
import { SingleMetricView } from './components/single_metric_view';
import { MultiMetricView } from './components/multi_metric_view';
import { PopulationView } from './components/population_view';
import { AdvancedView } from './components/advanced_view';
import { CategorizationView } from './components/categorization_view';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';
import { DatafeedPreviewFlyout } from '../common/datafeed_preview_flyout';

export const PickFieldsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  const jobType = jobCreator.type;

  useEffect(() => {
    const active =
      jobCreator.detectors.length > 0 &&
      (jobCreator.type !== JOB_TYPE.ADVANCED ||
        (jobCreator.type === JOB_TYPE.ADVANCED && jobValidator.modelMemoryLimit.valid)) &&
      jobValidator.bucketSpan.valid &&
      jobValidator.duplicateDetectors.valid &&
      jobValidator.validating === false &&
      (jobCreator.type !== JOB_TYPE.CATEGORIZATION ||
        (jobCreator.type === JOB_TYPE.CATEGORIZATION && jobValidator.categorizationField));
    setNextActive(active);
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          {jobType === JOB_TYPE.SINGLE_METRIC && (
            <SingleMetricView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.MULTI_METRIC && (
            <MultiMetricView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.POPULATION && (
            <PopulationView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.ADVANCED && (
            <AdvancedView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          {jobType === JOB_TYPE.CATEGORIZATION && (
            <CategorizationView isActive={isCurrentStep} setCanProceed={setNextActive} />
          )}
          <WizardNav
            previous={() =>
              setCurrentStep(
                jobCreator.type === JOB_TYPE.ADVANCED
                  ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
                  : WIZARD_STEPS.TIME_RANGE
              )
            }
            next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            nextActive={nextActive}
          >
            {jobType === JOB_TYPE.ADVANCED && (
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <JsonEditorFlyout
                    isDisabled={false}
                    jobEditorMode={EDITOR_MODE.EDITABLE}
                    datafeedEditorMode={EDITOR_MODE.HIDDEN}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DatafeedPreviewFlyout isDisabled={false} />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
