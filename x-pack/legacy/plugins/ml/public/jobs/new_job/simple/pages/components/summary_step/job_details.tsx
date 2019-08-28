/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiDescriptionList } from '@elastic/eui';
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
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.jobDetails.title', {
        defaultMessage: 'Job ID',
      }),
      description: jobCreator.jobId,
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.jobDescription.title', {
        defaultMessage: 'Job description',
      }),
      description:
        jobCreator.description.length > 0 ? (
          jobCreator.description
        ) : (
          <span style={{ fontStyle: 'italic' }}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.jobDescription.placeholder"
              defaultMessage="No description provided"
            />
          </span>
        ),
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.groups.title', {
        defaultMessage: 'Groups',
      }),
      description:
        jobCreator.groups.length > 0 ? (
          jobCreator.groups.join(', ')
        ) : (
          <span style={{ fontStyle: 'italic' }}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.groups.placeholder"
              defaultMessage="No groups selected"
            />
          </span>
        ),
    },
  ];

  const detectorDetails: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.bucketSpan.title', {
        defaultMessage: 'Bucket span',
      }),
      description: jobCreator.bucketSpan,
    },
  ];

  if (isMultiMetricJobCreator(jobCreator)) {
    detectorDetails.push({
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.splitField.title', {
        defaultMessage: 'Split field',
      }),
      description:
        isMultiMetricJobCreator(jobCreator) && jobCreator.splitField !== null ? (
          jobCreator.splitField.name
        ) : (
          <span style={{ fontStyle: 'italic' }}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.splitField.placeholder"
              defaultMessage="No split field selected"
            />
          </span>
        ),
    });
  }

  if (isPopulationJobCreator(jobCreator)) {
    detectorDetails.push({
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.populationField.title', {
        defaultMessage: 'Population field',
      }),
      description:
        isPopulationJobCreator(jobCreator) && jobCreator.splitField !== null ? (
          jobCreator.splitField.name
        ) : (
          <span style={{ fontStyle: jobCreator.splitField !== null ? 'inherit' : 'italic' }}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.populationField.placeholder"
              defaultMessage="No population field selected"
            />
          </span>
        ),
    });
  }

  detectorDetails.push({
    title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.influencers.title', {
      defaultMessage: 'Influencers',
    }),
    description:
      jobCreator.influencers.length > 0 ? (
        jobCreator.influencers.join(', ')
      ) : (
        <span style={{ fontStyle: 'italic' }}>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.summaryStep.jobDetails.influencers.placeholder"
            defaultMessage="No influencers selected"
          />
        </span>
      ),
  });

  const trueLabel = i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.trueLabel', {
    defaultMessage: 'True',
  });

  const falseLabel = i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.falseLabel', {
    defaultMessage: 'False',
  });

  const advancedDetails: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.jobDetails.enableModelPlot.title', {
        defaultMessage: 'Enable model plot',
      }),
      description: jobCreator.modelPlot ? trueLabel : falseLabel,
    },
    {
      title: i18n.translate(
        'xpack.ml.newJob.wizard.summaryStep.jobDetails.useDedicatedIndex.title',
        {
          defaultMessage: 'Use dedicated index',
        }
      ),
      description: jobCreator.useDedicatedIndex ? trueLabel : falseLabel,
    },
    {
      title: i18n.translate(
        'xpack.ml.newJob.wizard.summaryStep.jobDetails.modelMemoryLimit.title',
        {
          defaultMessage: 'Model memory limit',
        }
      ),
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
