/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { mockServices } from '../services/mocks/services';
import { TelemetryContextProvider } from '../components/create_integration/telemetry';

export const TestProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <I18nProvider>
      <KibanaContextProvider services={mockServices}>
        <TelemetryContextProvider>{children}</TelemetryContextProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};
