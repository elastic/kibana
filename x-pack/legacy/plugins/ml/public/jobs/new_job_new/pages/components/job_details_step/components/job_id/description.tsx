/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, memo, FC } from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

interface Props {
  children: JSX.Element;
}

export const Description: FC<Props> = memo(({ children }) => {
  const title = 'Job ID';
  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>{title}</h3>}
      description={
        <Fragment>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Fragment>
      }
    >
      <EuiFormRow label={title} describedByIds={['single-example-aria']}>
        {children}
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
