/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { AssistantAvailability, AssistantProvider } from '@kbn/elastic-assistant';
import { I18nProvider } from '@kbn/i18n-react';
import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataQualityProvider } from '../../data_quality_panel/data_quality_context';

interface Props {
  children: React.ReactNode;
  isILMAvailable?: boolean;
}

window.scrollTo = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
export const TestProvidersComponent: React.FC<Props> = ({ children, isILMAvailable = true }) => {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });
  const { toasts } = notificationServiceMock.createSetupContract();
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockGetComments = jest.fn(() => []);
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  const mockTelemetryEvents = {
    reportDataQualityIndexChecked: jest.fn(),
    reportDataQualityCheckAllCompleted: jest.fn(),
  };
  const mockAssistantAvailability: AssistantAvailability = {
    hasAssistantPrivilege: false,
    hasConnectorsAllPrivilege: true,
    hasConnectorsReadPrivilege: true,
    isAssistantEnabled: true,
  };
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: () => {},
    },
  });

  return (
    <I18nProvider>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <QueryClientProvider client={queryClient}>
          <AssistantProvider
            actionTypeRegistry={actionTypeRegistry}
            assistantAvailability={mockAssistantAvailability}
            augmentMessageCodeBlocks={jest.fn()}
            basePath={'https://localhost:5601/kbn'}
            docLinks={{
              ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
              DOC_LINK_VERSION: 'current',
            }}
            getComments={mockGetComments}
            http={mockHttp}
            baseConversations={{}}
          >
            <DataQualityProvider
              httpFetch={http.fetch}
              toasts={toasts}
              isILMAvailable={isILMAvailable}
              telemetryEvents={mockTelemetryEvents}
            >
              {children}
            </DataQualityProvider>
          </AssistantProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestProvidersComponent.displayName = 'TestProvidersComponent';

export const TestProviders = React.memo(TestProvidersComponent);
