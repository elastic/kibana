/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { CustomActions } from './CustomActions';

export const CustomizeUI = () => {
  return (
    <>
      <EuiTitle size="l">
        <h1>Customize UI</h1>
      </EuiTitle>
      <EuiSpacer size="l" />
      <CustomActions />
    </>
  );
};
