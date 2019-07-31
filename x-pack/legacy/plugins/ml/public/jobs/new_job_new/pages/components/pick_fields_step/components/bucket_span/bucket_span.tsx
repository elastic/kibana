/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { BucketSpanInput } from './bucket_span_input';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';

export const BucketSpan: FC = () => {
  const {
    jobCreator,
    jobCreatorUpdate,
    jobCreatorUpdated,
    jobValidator,
    jobValidatorUpdated,
  } = useContext(JobCreatorContext);
  const [bucketSpan, setBucketSpan] = useState(jobCreator.bucketSpan);
  const [validation, setValidation] = useState(jobValidator.bucketSpan);

  useEffect(() => {
    jobCreator.bucketSpan = bucketSpan;
    jobCreatorUpdate();
  }, [bucketSpan]);

  useEffect(() => {
    setBucketSpan(jobCreator.bucketSpan);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    setValidation(jobValidator.bucketSpan);
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <BucketSpanInput
        setBucketSpan={setBucketSpan}
        bucketSpan={bucketSpan}
        isInvalid={validation.valid === false}
      />
    </Description>
  );
};
