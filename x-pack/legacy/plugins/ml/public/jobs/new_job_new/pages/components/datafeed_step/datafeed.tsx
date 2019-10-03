/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { WizardNav } from '../wizard_nav';
import { JobIdInput } from './components/job_id';
import { JobDescriptionInput } from './components/job_description';
import { GroupsInput } from './components/groups';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { AdvancedSection } from './components/advanced_section';
import { AdditionalSection } from './components/additional_section';

export const DatafeedStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const { jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  useEffect(() => {
    const active =
      // jobValidator.jobId.valid &&
      // jobValidator.modelMemoryLimit.valid &&
      // jobValidator.groupIds.valid &&
      jobValidator.validating === false;
    setNextActive(active);
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          Datafeed!!
          {/* <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <JobIdInput />
              <GroupsInput />
            </EuiFlexItem>
            <EuiFlexItem>
              <JobDescriptionInput />
            </EuiFlexItem>
          </EuiFlexGroup> */}
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
