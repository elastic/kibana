/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';

import { useEstimateBucketSpan, ESTIMATE_STATUS } from './estimate_bucket_span';

interface Props {
  setEstimating(estimating: boolean): void;
}

export const BucketSpanEstimator: FC<Props> = ({ setEstimating }) => {
  const { status, estimateBucketSpan } = useEstimateBucketSpan();

  useEffect(() => {
    setEstimating(status === ESTIMATE_STATUS.RUNNING);
  }, [status]);

  return (
    <EuiButton disabled={status === ESTIMATE_STATUS.RUNNING} onClick={estimateBucketSpan}>
      <FormattedMessage
        id="xpack.ml.newJob.wizard.pickFieldsStep.bucketSpanEstimatorButton"
        defaultMessage="Estimate bucket span"
      />
    </EuiButton>
  );
};
