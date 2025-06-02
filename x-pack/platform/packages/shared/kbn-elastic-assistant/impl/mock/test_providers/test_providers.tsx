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
import React from 'react';

import { EuiThemeProvider as ThemeProvider } from '@elastic/eui';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserProfileService } from '@kbn/core/public';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { of } from 'rxjs';
import { AssistantProvider, AssistantProviderProps } from '../../assistant_context';
import { AssistantAvailability } from '../../assistant_context/types';
import { AssistantSpaceIdProvider } from '../../assistant/use_space_aware_context';

interface Props {
  assistantAvailability?: AssistantAvailability;
  children: React.ReactNode;
  providerContext?: Partial<AssistantProviderProps>;
}

window.scrollTo = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();
const ELASTIC_DOCS = 'https://www.elastic.co/docs/';

export const mockAssistantAvailability: AssistantAvailability = {
  hasSearchAILakeConfigurations: false,
  hasAssistantPrivilege: false,
  hasConnectorsAllPrivilege: true,
  hasConnectorsReadPrivilege: true,
  hasUpdateAIAssistantAnonymization: true,
  hasManageGlobalKnowledgeBase: true,
  isAssistantEnabled: true,
};

/** A utility for wrapping children in the providers required to run tests */
export const TestProvidersComponent: React.FC<Props> = ({
  assistantAvailability = mockAssistantAvailability,
  children,
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
  const mockNavigateToApp = jest.fn();
  const mockGetUrlForApp = jest.fn();
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

  const chrome = chromeServiceMock.createStartContract();
  chrome.getChromeStyle$.mockReturnValue(of('classic'));

  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AssistantProvider
            actionTypeRegistry={actionTypeRegistry}
            assistantAvailability={assistantAvailability}
            augmentMessageCodeBlocks={jest.fn().mockReturnValue([])}
            basePath={'https://localhost:5601/kbn'}
            docLinks={{
              ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
              links: {
                securitySolution: {
                  elasticAiFeatures: `${ELASTIC_DOCS}solutions/security/ai`,
                  thirdPartyLlmProviders: `${ELASTIC_DOCS}solutions/security/ai/set-up-connectors-for-large-language-models-llm`,
                  llmPerformanceMatrix: `${ELASTIC_DOCS}solutions/security/ai/large-language-model-performance-matrix`,
                },
                alerting: {
                  elasticManagedLlm: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/elastic-managed-llm`,
                  elasticManagedLlmUsageCost: `https://www.elastic.co/pricing`,
                },
              } as DocLinksStart['links'],
              DOC_LINK_VERSION: 'current',
            }}
            getComments={mockGetComments}
            getUrlForApp={mockGetUrlForApp}
            http={mockHttp}
            navigateToApp={mockNavigateToApp}
            {...providerContext}
            currentAppId={'test'}
            productDocBase={{
              installation: { getStatus: jest.fn(), install: jest.fn(), uninstall: jest.fn() },
            }}
            userProfileService={jest.fn() as unknown as UserProfileService}
            chrome={chrome}
          >
            <AssistantSpaceIdProvider spaceId="default">{children}</AssistantSpaceIdProvider>
          </AssistantProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestProvidersComponent.displayName = 'TestProvidersComponent';

export const TestProviders = React.memo(TestProvidersComponent);
