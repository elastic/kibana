/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiDescriptionList, EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../job_creator_context';
import { isMultiMetricJobCreator, isPopulationJobCreator } from '../../../common/job_creator';

export const JobDetails: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);

  interface ListItems {
    title: string;
    description: string | JSX.Element;
  }

  const jobDetails: ListItems[] = [
    {
      title: 'Job ID',
      description: jobCreator.jobId,
    },
    {
      title: 'Job description',
      description:
        jobCreator.description.length > 0 ? (
          jobCreator.description
        ) : (
          <span style={{ fontStyle: 'italic' }}>No description provided</span>
        ),
    },
    {
      title: 'Groups',
      description:
        jobCreator.groups.length > 0 ? (
          jobCreator.groups.join(', ')
        ) : (
          <span style={{ fontStyle: 'italic' }}>No groups selected</span>
        ),
    },
  ];

  const detectorDetails: ListItems[] = [
    {
      title: 'Bucket span',
      description: jobCreator.bucketSpan,
    },
  ];

  if (isMultiMetricJobCreator(jobCreator)) {
    detectorDetails.push({
      title: 'Split field',
      description:
        isMultiMetricJobCreator(jobCreator) && jobCreator.splitField !== null ? (
          jobCreator.splitField.name
        ) : (
          <span style={{ fontStyle: 'italic' }}>No split field selected</span>
        ),
    });
  }

  if (isPopulationJobCreator(jobCreator)) {
    detectorDetails.push({
      title: 'Population field',
      description:
        isPopulationJobCreator(jobCreator) && jobCreator.splitField !== null ? (
          jobCreator.splitField.name
        ) : (
          <span style={{ fontStyle: jobCreator.splitField !== null ? 'inherit' : 'italic' }}>
            No population field selected
          </span>
        ),
    });
  }

  detectorDetails.push({
    title: 'Influencers',
    description:
      jobCreator.influencers.length > 0 ? (
        jobCreator.influencers.join(', ')
      ) : (
        <span style={{ fontStyle: 'italic' }}>No split field selected</span>
      ),
  });

  const advancedDetails: ListItems[] = [
    {
      title: 'Enable model plot',
      description: jobCreator.modelPlot ? 'True' : 'False',
    },
    {
      title: 'Use dedicated index',
      description: jobCreator.useDedicatedIndex ? 'True' : 'False',
    },
    {
      title: 'Model memory limit',
      description: jobCreator.modelMemoryLimit !== null ? jobCreator.modelMemoryLimit : '',
    },
  ];

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={jobDetails} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={detectorDetails} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={advancedDetails} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
