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
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
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
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Documentation links</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>
        <EuiText>
          <h2>Plugin Structure</h2>
          <p>
            This example solution has both `server` and a `public` plugins. The `server` handles
            registration of example the RuleTypes, while the `public` handles creation of, and
            navigation for, these rule types.
          </p>
        </EuiText>
        <EuiSpacer />
        <CreateAlert {...deps} />
      </EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);
