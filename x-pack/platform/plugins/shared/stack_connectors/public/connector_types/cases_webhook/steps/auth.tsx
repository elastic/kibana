/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { EuiSpacer } from '@elastic/eui';

import { AuthConfig } from '../../../common/auth/auth_config';

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const AuthStep: FunctionComponent<Props> = ({ display, readOnly }) => {
  return (
    <span data-test-subj="authStep" style={{ display: display ? 'block' : 'none' }}>
      <AuthConfig readOnly={readOnly} />
      <EuiSpacer size="s" />
    </span>
  );
};
