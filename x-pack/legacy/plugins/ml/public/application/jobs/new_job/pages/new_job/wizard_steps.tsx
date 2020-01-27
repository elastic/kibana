/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { WIZARD_STEPS } from '../components/step_types';

import { TimeRangeStep } from '../components/time_range_step';

import { PickFieldsStep } from '../components/pick_fields_step';
import { JobDetailsStep } from '../components/job_details_step';
import { ValidationStep } from '../components/validation_step';
import { SummaryStep } from '../components/summary_step';
import { DatafeedStep } from '../components/datafeed_step';
import { useKibanaContext } from '../../../../contexts/kibana';

interface Props {
  currentStep: WIZARD_STEPS;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}

export const WizardSteps: FC<Props> = ({ currentStep, setCurrentStep }) => {
  const kibanaContext = useKibanaContext();
  // store whether the advanced and additional sections have been expanded.
  // has to be stored at this level to ensure it's remembered on wizard step change
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [additionalExpanded, setAdditionalExpanded] = useState(false);

  function getSummaryStepTitle() {
    if (kibanaContext.currentSavedSearch !== null) {
      return i18n.translate('xpack.ml.newJob.wizard.stepComponentWrapper.summaryTitleSavedSearch', {
        defaultMessage: 'New job from saved search {title}',
        values: { title: kibanaContext.currentSavedSearch.attributes.title as string },
      });
    } else if (kibanaContext.currentIndexPattern.id !== undefined) {
      return i18n.translate(
        'xpack.ml.newJob.wizard.stepComponentWrapper.summaryTitleIndexPattern',
        {
          defaultMessage: 'New job from index pattern {title}',
          values: { title: kibanaContext.currentIndexPattern.title },
        }
      );
    }
    return '';
  }

  return (
    <Fragment>
      {currentStep === WIZARD_STEPS.TIME_RANGE && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleTimeRange">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.timeRangeTitle"
              defaultMessage="Time range"
            />
          </Title>
          <TimeRangeStep
            isCurrentStep={currentStep === WIZARD_STEPS.TIME_RANGE}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleConfigureDatafeed">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.configureDatafeedTitle"
              defaultMessage="Configure datafeed"
            />
          </Title>
          <DatafeedStep
            isCurrentStep={currentStep === WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.PICK_FIELDS && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitlePickFields">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.pickFieldsTitle"
              defaultMessage="Pick fields"
            />
          </Title>
          <PickFieldsStep
            isCurrentStep={currentStep === WIZARD_STEPS.PICK_FIELDS}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.JOB_DETAILS && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleJobDetails">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.jobDetailsTitle"
              defaultMessage="Job details"
            />
          </Title>
          <JobDetailsStep
            isCurrentStep={currentStep === WIZARD_STEPS.JOB_DETAILS}
            setCurrentStep={setCurrentStep}
            advancedExpanded={advancedExpanded}
            setAdvancedExpanded={setAdvancedExpanded}
            additionalExpanded={additionalExpanded}
            setAdditionalExpanded={setAdditionalExpanded}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.VALIDATION && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleValidation">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.validationTitle"
              defaultMessage="Validation"
            />
          </Title>
          <ValidationStep
            isCurrentStep={currentStep === WIZARD_STEPS.VALIDATION}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.SUMMARY && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleSummary">{getSummaryStepTitle()}</Title>
          <SummaryStep
            isCurrentStep={currentStep === WIZARD_STEPS.SUMMARY}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
    </Fragment>
  );
};

const Title: FC<{ 'data-test-subj': string }> = ({ 'data-test-subj': dataTestSubj, children }) => {
  return (
    <Fragment>
      <EuiTitle>
        <h2 data-test-subj={dataTestSubj}>{children}</h2>
      </EuiTitle>
      <EuiSpacer />
    </Fragment>
  );
};
