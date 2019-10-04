/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { JobIdInput } from './components/job_id';
import { QueryInput } from './components/query';
import { QueryDelayInput } from './components/query_delay';
import { FrequencyInput } from './components/frequency';
import { ScrollSizeInput } from './components/scroll_size';
import { TimeField } from './components/time_field';
import { GroupsInput } from './components/groups';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { AdvancedSection } from './components/advanced_section';
import { AdditionalSection } from './components/additional_section';

import { AdvancedJobCreator } from '../../../common/job_creator';

export const DatafeedStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);
  const [validQuery, setValidQuery] = useState(false);

  useEffect(() => {
    const active =
      // jobValidator.jobId.valid &&
      // jobValidator.modelMemoryLimit.valid &&
      // jobValidator.groupIds.valid &&
      validQuery && jobValidator.validating === false;
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
            previous={() => setCurrentStep(WIZARD_STEPS.TIME_RANGE)}
            next={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            nextActive={nextActive}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
