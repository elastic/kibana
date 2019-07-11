/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WizardNav } from '../../../../../data_frame/components/wizard_nav';
import { JobIdInput } from './components/job_id';
import { JobDescriptionInput } from './components/job_description';
import { GroupsInput } from './components/groups';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { KibanaContext, isKibanaContext } from '../../../../../data_frame/common/kibana_context';

export const JobDetailsStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);

  const [jobId, setJobId] = useState(jobCreator.jobId);
  const [jobDescription, setJobDescription] = useState(jobCreator.description);
  const [selectedGroups, setSelectedGroups] = useState(jobCreator.groups);

  useEffect(() => {
    jobCreator.jobId = jobId;
    jobCreatorUpdate();
  }, [jobId]);

  useEffect(() => {
    jobCreator.description = jobDescription;
    jobCreatorUpdate();
  }, [jobDescription]);

  useEffect(() => {
    jobCreator.groups = selectedGroups;
    jobCreatorUpdate();
  }, [selectedGroups.join()]);

  function nextActive(): boolean {
    return jobId !== '';
  }

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <JobIdInput jobId={jobId} setJobId={setJobId} />
              <GroupsInput
                selectedGroupNames={selectedGroups}
                setSelectedGroupNames={setSelectedGroups}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <JobDescriptionInput
                jobDescription={jobDescription}
                setJobDescription={setJobDescription}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <WizardNav
            previous={() => setCurrentStep(WIZARD_STEPS.PICK_FIELDS)}
            next={() => setCurrentStep(WIZARD_STEPS.SUMMARY)}
            nextActive={nextActive()}
          />
        </Fragment>
      )}
    </Fragment>
  );
};
