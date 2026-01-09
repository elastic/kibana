/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const IntegrationManagement = React.memo(() => {
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header />
      <KibanaPageTemplate.Section>
        <EuiText>
          <p>Welcome to Automatic Import V2 Integration Management.</p>
        </EuiText>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
});
IntegrationManagement.displayName = 'IntegrationManagement';
