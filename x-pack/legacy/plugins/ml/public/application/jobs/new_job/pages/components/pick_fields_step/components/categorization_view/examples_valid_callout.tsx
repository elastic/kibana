/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiCallOut } from '@elastic/eui';

interface Props {
  examplesValid: number;
}

export const ExamplesValidCallout: FC<Props> = ({ examplesValid }) => {
  function getCallOut() {
    if (examplesValid < 0.2) {
      return (
        <EuiCallOut color="danger">
          {Math.floor(examplesValid * 100)}% of field values tested contain valid tokens
        </EuiCallOut>
      );
    } else if (examplesValid < 0.75) {
      return (
        <EuiCallOut color="warning">
          {Math.floor(examplesValid * 100)}% of field values tested contain valid tokens
        </EuiCallOut>
      );
    } else {
      return (
        <EuiCallOut color="success">
          {Math.floor(examplesValid * 100)}% of field values tested contain valid tokens
        </EuiCallOut>
      );
    }
  }

  return <Fragment>{getCallOut()}</Fragment>;
};
