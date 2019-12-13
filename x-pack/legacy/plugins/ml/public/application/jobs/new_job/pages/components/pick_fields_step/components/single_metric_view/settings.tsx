/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { BucketSpan } from '../bucket_span';
import { SparseDataSwitch } from '../sparse_data';

import { convertToMultiMetricJob } from '../../../../../common/job_creator/util/general';

interface Props {
  setIsValid: (proceed: boolean) => void;
}

export const SingleMetricSettings: FC<Props> = ({ setIsValid }) => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);

  useEffect(() => {
    jobCreator.bucketSpan = bucketSpan;
    jobCreatorUpdate();
    setIsValid(bucketSpan !== '');
  }, [bucketSpan]);

  useEffect(() => {
    setBucketSpan(jobCreator.bucketSpan);
  }, [jobCreatorUpdated]);

  const convertToMultiMetric = () => {
    convertToMultiMetricJob(jobCreator);
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
          <EuiButtonEmpty onClick={convertToMultiMetric}>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.singleMetricView.convertToMultiMetricButton"
              defaultMessage="Convert to multi metric job"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
