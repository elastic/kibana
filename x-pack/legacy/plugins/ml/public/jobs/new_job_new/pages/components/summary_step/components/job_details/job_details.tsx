/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiDescriptionList } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import {
  isMultiMetricJobCreator,
  isPopulationJobCreator,
  isAdvancedJobCreator,
} from '../../../../../common/job_creator';
import { getNewJobDefaults } from '../../../../../../../services/ml_server_info';
import { ListItems, falseLabel, trueLabel, defaultLabel, Italic } from '../common';
import { useKibanaContext } from '../../../../../../../contexts/kibana';

export const JobDetails: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);
  const kibanaContext = useKibanaContext();
  const dateFormat: string = kibanaContext.kibanaConfig.get('dateFormat');
  const { anomaly_detectors: anomalyDetectors } = getNewJobDefaults();

  const isAdvanced = isAdvancedJobCreator(jobCreator);

  const modelMemoryLimitDefault = anomalyDetectors.model_memory_limit || '';
  const modelMemoryLimit =
    jobCreator.modelMemoryLimit !== null ? (
      jobCreator.modelMemoryLimit
    ) : (
      <Italic>{`${modelMemoryLimitDefault} (${defaultLabel})`}</Italic>
    );

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
          <Italic>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.jobDescription.placeholder"
              defaultMessage="No description provided"
            />
          </Italic>
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
          <Italic>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.groups.placeholder"
              defaultMessage="No groups selected"
            />
          </Italic>
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
          <Italic>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.summaryStep.jobDetails.splitField.placeholder"
              defaultMessage="No split field selected"
            />
          </Italic>
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

  if (isAdvanced && jobCreator.categorizationFieldName !== null) {
    detectorDetails.push({
      title: i18n.translate(
        'xpack.ml.newJob.wizard.summaryStep.jobDetails.categorizationField.title',
        {
          defaultMessage: 'Categorization field',
        }
      ),
      description: jobCreator.categorizationFieldName,
    });
  }

  if (isAdvanced && jobCreator.summaryCountFieldName !== null) {
    detectorDetails.push({
      title: i18n.translate(
        'xpack.ml.newJob.wizard.summaryStep.jobDetails.summaryCountField.title',
        {
          defaultMessage: 'Summary count field',
        }
      ),
      description: jobCreator.summaryCountFieldName,
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
        <Italic>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.summaryStep.jobDetails.influencers.placeholder"
            defaultMessage="No influencers selected"
          />
        </Italic>
      ),
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
      description: modelMemoryLimit,
    },
  ];

  const timeRangeDetails: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.timeRange.start.title', {
        defaultMessage: 'Start',
      }),
      description: moment(jobCreator.start).format(dateFormat),
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.timeRange.end.title', {
        defaultMessage: 'End',
      }),
      description: moment(jobCreator.end).format(dateFormat),
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
      {isAdvanced === false && (
        <EuiFlexItem>
          <EuiDescriptionList compressed listItems={timeRangeDetails} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
