/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import type { ReactElement } from 'react';
import React, { Children, cloneElement, Fragment } from 'react';
export const ErrableFormRow = ({
  errorKey,
  isShowingErrors,
  errors,
  children,
  id,
  ...rest
}: {
  errorKey: string;
  isShowingErrors: boolean;
  errors: { [key: string]: string[] };
  children: ReactElement;
  [key: string]: any;
  id?: string;
}) => {
  return (
    <EuiFormRow
      isInvalid={isShowingErrors && errors[errorKey].length > 0}
      error={errors[errorKey]}
      id={id}
      {...rest}
    >
      <Fragment>{Children.map(children, (child) => cloneElement(child, { id }))}</Fragment>
    </EuiFormRow>
  );
};
