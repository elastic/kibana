/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import { EditFieldFormRow } from '../fields/edit_field';

export const NormsParameter = () => (
  <EditFieldFormRow
    title={<h3>Use norms</h3>}
    description="This is description text."
    formFieldPath="norms"
    direction="column"
  >
    <EuiCallOut color="warning">
      <p>Enabling norms requires a lot of disk use.</p>
    </EuiCallOut>
  </EditFieldFormRow>
);
