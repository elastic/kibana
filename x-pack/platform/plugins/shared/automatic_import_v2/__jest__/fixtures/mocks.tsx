/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';

export const mockConnectors = [
  {
    id: 'connector-1',
    name: 'My OpenAI Connector',
    actionTypeId: '.gen-ai',
    isPreconfigured: false,
    isMissingSecrets: false,
  },
  {
    id: 'connector-2',
    name: 'My Bedrock Connector',
    actionTypeId: '.bedrock',
    isPreconfigured: true,
    isMissingSecrets: false,
  },
  {
    id: 'Elastic-Managed-LLM',
    name: 'Elastic Managed LLM',
    actionTypeId: '.inference',
    isPreconfigured: true,
    isMissingSecrets: false,
  },
];

export const mockActionTypes = [
  { id: '.gen-ai', name: 'OpenAI', enabled: true },
  { id: '.bedrock', name: 'Amazon Bedrock', enabled: true },
  { id: '.gemini', name: 'Google Gemini', enabled: true },
  { id: '.inference', name: 'Inference', enabled: true },
];

export const mockExistingPackageNames = [
  'existing_integration',
  'my_custom_package',
  'test_package',
];

export const createMockGetInstalledPackages = () =>
  jest.fn(() =>
    Promise.resolve({
      items: mockExistingPackageNames.map((id) => ({ id })),
    })
  );

export const createMockServices = (overrides: Record<string, unknown> = {}) => {
  const coreMockStart = coreMock.createStart();

  return {
    ...coreMockStart,
    http: {
      ...coreMockStart.http,
      get: jest.fn(),
    },
    application: {
      ...coreMockStart.application,
      navigateToApp: jest.fn(),
    },
    settings: {
      client: {
        get: jest.fn().mockReturnValue(undefined),
      },
    },
    triggersActionsUi: {
      ...triggersActionsUiMock.createStart(),
      getAddConnectorFlyout: jest.fn().mockReturnValue(<div data-test-subj="addConnectorFlyout" />),
      actionTypeRegistry: {
        get: jest.fn().mockReturnValue({ iconClass: 'logoOpenAI' }),
      },
    },
    ...overrides,
  };
};

interface TestProvidersProps {
  children: React.ReactNode;
  services?: ReturnType<typeof createMockServices>;
}

export const createTestProviders = (services = createMockServices()) => {
  const TestProviders: React.FC<TestProvidersProps> = ({ children }) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    </I18nProvider>
  );

  return TestProviders;
};

export const TestProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <KibanaContextProvider services={createMockServices()}>{children}</KibanaContextProvider>
  </I18nProvider>
);
