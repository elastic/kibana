/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { JobIdInput } from './components/job_id';
import { JobDescriptionInput } from './components/job_description';
import { GroupsInput } from './components/groups';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { AdvancedSection } from './components/advanced_section';

interface Props extends StepProps {
  advancedExpanded: boolean;
  setAdvancedExpanded: (a: boolean) => void;
}

export const JobDetailsStep: FC<Props> = ({
  setCurrentStep,
  isCurrentStep,
  advancedExpanded,
  setAdvancedExpanded,
}) => {
  const { jobCreator, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [nextActive, setNextActive] = useState(false);

  useEffect(() => {
    setNextActive(jobCreator.jobId !== '');
  }, [jobCreatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <JobIdInput />
              <GroupsInput />
            </EuiFlexItem>
            <EuiFlexItem>
              <JobDescriptionInput />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <AdvancedSection
            advancedExpanded={advancedExpanded}
            setAdvancedExpanded={setAdvancedExpanded}
          />
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            next={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
            nextActive={nextActive}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
