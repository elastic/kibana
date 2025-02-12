/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import type { Authorization } from '../../hooks/use_authorization';
import { MissingPrivilegesDescription } from './missing_privileges_description';
import * as i18n from './translations';

type MissingPrivilegesTooltip = Partial<Authorization> & {
  children: React.ReactElement; // EuiToolTip requires a single ReactElement child
};
export const MissingPrivilegesTooltip = React.memo<MissingPrivilegesTooltip>(
  ({ children, ...authMissing }) => (
    <EuiToolTip
      title={i18n.PRIVILEGES_MISSING_TITLE}
      content={<MissingPrivilegesDescription {...authMissing} />}
    >
      {children}
    </EuiToolTip>
  )
);
MissingPrivilegesTooltip.displayName = 'MissingPrivilegesTooltip';
