/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { BucketSpanInput } from './bucket_span_input';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { BucketSpanEstimator } from '../bucket_span_estimator';
import { isEsqlJobCreator } from '../../../../../common/job_creator';

interface Props {
  setIsValid: (proceed: boolean) => void;
  hideEstimateButton?: boolean;
}

export const BucketSpan: FC<Props> = ({ setIsValid, hideEstimateButton = false }) => {
  const { jobCreator, jobCreatorUpdate, jobCreatorUpdated, jobValidator, jobValidatorUpdated } =
    useContext(JobCreatorContext);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);
  const [validation, setValidation] = useState(jobValidator.bucketSpan);
  const [estimating, setEstimating] = useState(false);
  // an ES|QL job's buckets must match the BUCKET interval of its query
  const isSetByQuery = isEsqlJobCreator(jobCreator) && jobCreator.isBucketSpanFromQuery;
  const titleId = useGeneratedHtmlId({
    prefix: 'bucketSpan',
  });
  const errorId = useGeneratedHtmlId({
    prefix: 'bucketSpanError',
  });

  useEffect(() => {
    jobCreator.bucketSpan = bucketSpan;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketSpan]);

  useEffect(() => {
    setBucketSpan(jobCreator.bucketSpan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  useEffect(() => {
    setValidation(jobValidator.bucketSpan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  useEffect(() => {
    setIsValid(estimating === false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimating]);

  return (
    <Description
      validation={validation}
      titleId={titleId}
      errorId={errorId}
      helpText={
        isSetByQuery ? (
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.bucketSpan.setByQueryHelpText"
            defaultMessage="Set by the {bucket} interval in the ES|QL query."
            values={{ bucket: <EuiCode>BUCKET</EuiCode> }}
          />
        ) : undefined
      }
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <BucketSpanInput
            titleId={titleId}
            setBucketSpan={setBucketSpan}
            // @ts-expect-error bucketSpan is of type `estypes.Duration`
            bucketSpan={bucketSpan}
            isInvalid={validation.valid === false}
            disabled={estimating || isSetByQuery}
            errorId={errorId}
          />
        </EuiFlexItem>
        {hideEstimateButton === false && isSetByQuery === false && (
          <EuiFlexItem>
            <BucketSpanEstimator setEstimating={setEstimating} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </Description>
  );
};
