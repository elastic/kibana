/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable no-console */
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { ThemeProvider } from 'styled-components';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssistantProvider, AssistantProviderProps } from '../../assistant_context';
import { AssistantAvailability, Conversation } from '../../assistant_context/types';

interface Props {
  assistantAvailability?: AssistantAvailability;
  children: React.ReactNode;
  getInitialConversations?: () => Record<string, Conversation>;
  providerContext?: Partial<AssistantProviderProps>;
}

window.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockGetInitialConversations = () => ({});

export const mockAssistantAvailability: AssistantAvailability = {
  hasAssistantPrivilege: false,
  hasConnectorsAllPrivilege: true,
  hasConnectorsReadPrivilege: true,
  isAssistantEnabled: true,
};

/** A utility for wrapping children in the providers required to run tests */
export const TestProvidersComponent: React.FC<Props> = ({
  assistantAvailability = mockAssistantAvailability,
  children,
  getInitialConversations = mockGetInitialConversations,
  providerContext,
}) => {
  const actionTypeRegistry = actionTypeRegistryMock.create();
  actionTypeRegistry.get = jest.fn().mockReturnValue({
    id: '12345',
    actionTypeId: '.gen-ai',
    actionTypeTitle: 'OpenAI',
    iconClass: 'logoGenAI',
  });
  const mockGetComments = jest.fn(() => []);
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
  });

  return (
    <I18nProvider>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <QueryClientProvider client={queryClient}>
          <AssistantProvider
            actionTypeRegistry={actionTypeRegistry}
            assistantAvailability={assistantAvailability}
            augmentMessageCodeBlocks={jest.fn().mockReturnValue([])}
            baseAllow={[]}
            baseAllowReplacement={[]}
            basePath={'https://localhost:5601/kbn'}
            defaultAllow={[]}
            defaultAllowReplacement={[]}
            docLinks={{
              ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
              DOC_LINK_VERSION: 'current',
            }}
            getComments={mockGetComments}
            getInitialConversations={getInitialConversations}
            setConversations={jest.fn()}
            setDefaultAllow={jest.fn()}
            setDefaultAllowReplacement={jest.fn()}
            http={mockHttp}
            {...providerContext}
          >
            {children}
          </AssistantProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestProvidersComponent.displayName = 'TestProvidersComponent';

export const TestProviders = React.memo(TestProvidersComponent);
