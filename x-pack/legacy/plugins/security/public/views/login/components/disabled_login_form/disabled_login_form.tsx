/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiText } from '@elastic/eui';
import React, { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  message: ReactNode;
}

export const DisabledLoginForm: React.FC<Props> = props => (
  <EuiPanel>
    <EuiText color="danger" style={{ textAlign: 'center' }}>
      <p>{props.title}</p>
    </EuiText>
    <EuiText style={{ textAlign: 'center' }}>
      <p>{props.message}</p>
    </EuiText>
  </EuiPanel>
);
