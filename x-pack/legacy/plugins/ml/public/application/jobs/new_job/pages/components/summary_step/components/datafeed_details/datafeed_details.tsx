/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiDescriptionList, EuiFormRow } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { MLJobEditor } from '../../../../../../jobs_list/components/ml_job_editor';
import { calculateDatafeedFrequencyDefaultSeconds } from '../../../../../../../../../common/util/job_utils';
import { DEFAULT_QUERY_DELAY } from '../../../../../../../../../common/constants/new_job';
import { getNewJobDefaults } from '../../../../../../../services/ml_server_info';
import { ListItems, defaultLabel, Italic } from '../common';

const EDITOR_HEIGHT = '200px';

export const DatafeedDetails: FC = () => {
  const { jobCreator } = useContext(JobCreatorContext);
  const { datafeeds } = getNewJobDefaults();

  const queryString = JSON.stringify(jobCreator.query, null, 2);
  const defaultFrequency = calculateDatafeedFrequencyDefaultSeconds(jobCreator.bucketSpanMs / 1000);
  const scrollSizeDefault = datafeeds.scroll_size || '';

  const queryDelay = jobCreator.queryDelay || (
    <Italic>{`${DEFAULT_QUERY_DELAY} (${defaultLabel})`}</Italic>
  );
  const frequency = jobCreator.frequency || (
    <Italic>{`${defaultFrequency} (${defaultLabel})`}</Italic>
  );
  const scrollSize =
    jobCreator.scrollSize !== null ? (
      `${jobCreator.scrollSize}`
    ) : (
      <Italic>{`${scrollSizeDefault} (${defaultLabel})`}</Italic>
    );

  const datafeedDetails: ListItems[] = [
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.datafeedDetails.timeField.title', {
        defaultMessage: 'Time field',
      }),
      description: jobCreator.timeFieldName,
    },
    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.datafeedDetails.queryDelay.title', {
        defaultMessage: 'Query delay',
      }),
      description: queryDelay,
    },

    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.datafeedDetails.frequency.title', {
        defaultMessage: 'Frequency',
      }),
      description: frequency,
    },

    {
      title: i18n.translate('xpack.ml.newJob.wizard.summaryStep.datafeedDetails.scrollSize.title', {
        defaultMessage: 'Scroll size',
      }),
      description: scrollSize,
    },
  ];

  const queryTitle = i18n.translate(
    'xpack.ml.newJob.wizard.summaryStep.datafeedDetails.query.title',
    {
      defaultMessage: 'Scroll size',
    }
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFormRow label={queryTitle} fullWidth={true}>
          <MLJobEditor value={queryString} height={EDITOR_HEIGHT} readOnly={true} />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiDescriptionList compressed listItems={datafeedDetails} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
