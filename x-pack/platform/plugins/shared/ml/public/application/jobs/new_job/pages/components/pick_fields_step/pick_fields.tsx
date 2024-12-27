/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';

import { useFieldStatsFlyoutContext } from '@kbn/ml-field-stats-flyout';

import { JobCreatorContext } from '../job_creator_context';
import { WizardNav } from '../wizard_nav';
import type { StepProps } from '../step_types';
import { WIZARD_STEPS } from '../step_types';
import { SingleMetricView } from './components/single_metric_view';
import { MultiMetricView } from './components/multi_metric_view';
import { PopulationView } from './components/population_view';
import { AdvancedView } from './components/advanced_view';
import { CategorizationView } from './components/categorization_view';
import { RareView } from './components/rare_view';
import { GeoView } from './components/geo_view';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';
import {
  isSingleMetricJobCreator,
  isMultiMetricJobCreator,
  isPopulationJobCreator,
  isCategorizationJobCreator,
  isAdvancedJobCreator,
  isRareJobCreator,
  isGeoJobCreator,
} from '../../../common/job_creator';

export const PickFieldsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobCreator, jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  const [selectionValid, setSelectionValid] = useState(false);
  const { setIsFlyoutVisible, setFieldName } = useFieldStatsFlyoutContext();

  useEffect(() => {
    setNextActive(selectionValid && jobValidator.isPickFieldsStepValid);

    return () => {
      setIsFlyoutVisible(false);
      setFieldName(undefined);
    };
  }, [jobValidator, jobValidatorUpdated, selectionValid, setIsFlyoutVisible, setFieldName]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          {isSingleMetricJobCreator(jobCreator) && (
            <SingleMetricView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isMultiMetricJobCreator(jobCreator) && (
            <MultiMetricView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isPopulationJobCreator(jobCreator) && (
            <PopulationView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isAdvancedJobCreator(jobCreator) && (
            <AdvancedView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isCategorizationJobCreator(jobCreator) && (
            <CategorizationView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isRareJobCreator(jobCreator) && (
            <RareView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          {isGeoJobCreator(jobCreator) && (
            <GeoView isActive={isCurrentStep} setCanProceed={setSelectionValid} />
          )}
          <WizardNav
            previous={() =>
              setCurrentStep(
                isAdvancedJobCreator(jobCreator)
                  ? WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED
                  : WIZARD_STEPS.TIME_RANGE
              )
            }
            next={() => setCurrentStep(WIZARD_STEPS.JOB_DETAILS)}
            nextActive={nextActive}
          >
            {isAdvancedJobCreator(jobCreator) && (
              <JsonEditorFlyout
                isDisabled={false}
                jobEditorMode={EDITOR_MODE.EDITABLE}
                datafeedEditorMode={EDITOR_MODE.EDITABLE}
              />
            )}
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
