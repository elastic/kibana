/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiText,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { CreateAlert } from './create_alert';
import { AlertingExampleComponentParams } from '../application';

export const DocumentationPage = (
  deps: Pick<AlertingExampleComponentParams, 'triggersActionsUi'>
) => (
  <EuiPageBody>
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to the Alerting plugin example</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>Documentation links</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiText>
        <h2>Plugin Structure</h2>
        <p>
          This example solution has both `server` and a `public` plugins. The `server` handles
          registration of example the RuleTypes, while the `public` handles creation of, and
          navigation for, these rule types.
        </p>
        <EuiCallOut title="Transport Layer Security" iconType="warning" color="warning">
          If you see a message about needing to enable the Transport Layer Security, start ES with{' '}
          <code>yarn es snapshot --ssl --license trial</code> and Kibana with{' '}
          <code>yarn start --run-examples --ssl</code>. If you running chrome on a mac, you may need
          to type in <code>thisisunsafe</code> if you see the Certificate invalid screen with no way
          to &lsquo;proceed anyway&rsquo;.
        </EuiCallOut>
      </EuiText>
      <EuiSpacer />
      <CreateAlert {...deps} />
    </EuiPageSection>
  </EuiPageBody>
);
