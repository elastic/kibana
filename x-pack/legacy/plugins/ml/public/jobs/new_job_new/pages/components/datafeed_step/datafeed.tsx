/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { QueryInput } from './components/query';
import { QueryDelayInput } from './components/query_delay';
import { FrequencyInput } from './components/frequency';
import { ScrollSizeInput } from './components/scroll_size';
import { TimeField } from './components/time_field';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';

export const DatafeedStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  const [validQuery, setValidQuery] = useState(false);

  useEffect(() => {
    const active =
      validQuery &&
      jobValidator.queryDelay.valid &&
      jobValidator.frequency.valid &&
      jobValidator.scrollSize.valid &&
      jobValidator.validating === false;
    setNextActive(active);
  }, [jobValidatorUpdated, validQuery]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <QueryInput setValidQuery={setValidQuery} />
            </EuiFlexItem>
            <EuiFlexItem>
              <QueryDelayInput />
              <FrequencyInput />
              <ScrollSizeInput />
              <TimeField />
            </EuiFlexItem>
          </EuiFlexGroup>
          <WizardNav
            // previous={() => setCurrentStep(WIZARD_STEPS.TIME_RANGE)}
            next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            nextActive={nextActive}
          >
            <JsonEditorFlyout
              isDisabled={false}
              jobEditorMode={EDITOR_MODE.HIDDEN}
              datafeedEditorMode={EDITOR_MODE.EDITABLE}
            />
          </WizardNav>
        </Fragment>
      )}
    </Fragment>
  );
};
