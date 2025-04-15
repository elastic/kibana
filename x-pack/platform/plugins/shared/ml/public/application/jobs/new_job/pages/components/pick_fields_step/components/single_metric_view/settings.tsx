/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

import { convertToMultiMetricJob } from '../../../../../common/job_creator/util/general';

import { JobCreatorContext } from '../../../job_creator_context';

import { BucketSpan } from '../bucket_span';
import { SparseDataSwitch } from '../sparse_data';
import { useNavigateToManagementMlLink } from '../../../../../../../contexts/kibana/use_create_url';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const SingleMetricSettings: FC<Props> = ({ setIsValid }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const navigateToMlManagement = useNavigateToManagementMlLink('anomaly_detection');

  const convertToMultiMetric = () => {
    convertToMultiMetricJob(jobCreator, navigateToMlManagement);
  };

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <BucketSpan setIsValid={setIsValid} />
        </EuiFlexItem>
        <EuiFlexItem>
          <SparseDataSwitch />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={convertToMultiMetric}
            data-test-subj={'mlJobWizardButtonConvertToMultiMetric'}
          >
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.singleMetricView.convertToMultiMetricButton"
              defaultMessage="Convert to multi-metric job"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
