/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFieldText } from '@elastic/eui';

interface Props {
  bucketSpan: string;
  setBucketSpan: (bs: string) => void;
  isInvalid: boolean;
}

export const BucketSpanInput: FC<Props> = ({ bucketSpan, setBucketSpan, isInvalid }) => {
  return (
    <EuiFieldText
      placeholder="Bucket span"
      value={bucketSpan}
      onChange={e => setBucketSpan(e.target.value)}
      isInvalid={isInvalid}
      data-test-subj="mlJobWizardInputBucketSpan"
    />
  );
};
