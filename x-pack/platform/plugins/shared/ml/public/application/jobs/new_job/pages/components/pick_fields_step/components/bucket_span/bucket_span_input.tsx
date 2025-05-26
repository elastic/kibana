/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiFieldText } from '@elastic/eui';

interface Props {
  bucketSpan: string;
  setBucketSpan: (bs: string) => void;
  isInvalid: boolean;
  disabled: boolean;
  titleId: string;
}

export const BucketSpanInput: FC<Props> = ({
  bucketSpan,
  setBucketSpan,
  isInvalid,
  disabled,
  titleId,
}) => {
  return (
    <EuiFieldText
      disabled={disabled}
      value={bucketSpan}
      onChange={(e) => setBucketSpan(e.target.value)}
      isInvalid={isInvalid}
      data-test-subj="mlJobWizardInputBucketSpan"
      aria-labelledby={titleId}
    />
  );
};
