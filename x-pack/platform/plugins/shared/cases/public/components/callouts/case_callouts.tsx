/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { useLicense } from '../../common/use_license';
import { PlatinumLicenseCallout } from './platinum_callout';

const CaseCalloutsComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { isAtLeastPlatinum } = useLicense();

  return !isAtLeastPlatinum() ? (
    <EuiFlexGroup
      gutterSize="none"
      css={{ marginBottom: euiTheme.size.l }}
      data-test-subj="case-callouts"
    >
      <EuiFlexItem>
        <PlatinumLicenseCallout />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};

CaseCalloutsComponent.displayName = 'CaseCalloutsComponent';

export const CaseCallouts = React.memo(CaseCalloutsComponent);
