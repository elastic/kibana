/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiDescribedFormGroup, EuiFormRow, EuiFieldText } from '@elastic/eui';

interface Props {
  bucketSpan: string;
  setBucketSpan: (bs: string) => void;
}

export const BucketSpanInput: FC<Props> = ({ bucketSpan, setBucketSpan }) => {
  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>Bucket span</h3>}
      description={
        <Fragment>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Fragment>
      }
    >
      <EuiFormRow label="Bucket span" describedByIds={['single-example-aria']}>
        <EuiFieldText
          placeholder="Bucket span"
          value={bucketSpan}
          onChange={e => setBucketSpan(e.target.value)}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
