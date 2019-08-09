/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiText } from '@elastic/eui';

export const MultiElementSettings: FunctionComponent = () => (
  <EuiText size="s">
    <p>Multiple elements are currently selected.</p>
    <p>
      Deselect these elements to edit their individual settings, press (G) to group them, or save
      this selection as a new element to re-use it throughout your workpad.
    </p>
  </EuiText>
);
