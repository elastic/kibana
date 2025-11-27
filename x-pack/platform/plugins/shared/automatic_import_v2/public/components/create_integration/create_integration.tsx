/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { Services } from '../../services/types';

interface CreateIntegrationProps {
  services: Services;
}

// TODO: Add TelemetryContextProvider
export const CreateIntegration = React.memo<CreateIntegrationProps>(({ services }) => (
  <KibanaContextProvider services={services}>
    <CreateIntegrationContent />
  </KibanaContextProvider>
));
CreateIntegration.displayName = 'CreateIntegration';

// TODO: change to Router and navigation in a later task
const CreateIntegrationContent = React.memo(() => {
  return (
    <KibanaPageTemplate>
      <KibanaPageTemplate.Header />
      <KibanaPageTemplate.Section>
        <EuiText>
          <p>Welcome to Automatic Import V2.</p>
        </EuiText>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
});
CreateIntegrationContent.displayName = 'CreateIntegrationContent';
