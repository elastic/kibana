/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { cloneElement, Children, Fragment } from 'react';
import { EuiFormRow } from '@elastic/eui';

export const ErrableFormRow = ({ errorKey, isShowingErrors, errors, children, ...rest }) => {
  return (
    <EuiFormRow
      isInvalid={isShowingErrors && errors[errorKey].length > 0}
      error={errors[errorKey]}
      {...rest}
    >
      <Fragment>
        {Children.map(children, child =>
          cloneElement(child, {
            isInvalid: isShowingErrors && errors[errorKey].length > 0,
          })
        )}
      </Fragment>
    </EuiFormRow>
  );
};
