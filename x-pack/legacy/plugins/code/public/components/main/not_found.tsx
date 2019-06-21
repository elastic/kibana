/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { ErrorPanel } from './error_panel';

export const NotFound = () => (
  <EuiFlexGroup alignItems="center" justifyContent="flexStart">
    <ErrorPanel
      title={<h2>404</h2>}
      content="Unfortunately that page doesn’t exist. You can try searching to find what you’re looking for."
    />
  </EuiFlexGroup>
);
