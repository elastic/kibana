/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { AssistantProvider } from '@kbn/elastic-assistant';
import { I18nProvider } from '@kbn/i18n-react';
import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { DataQualityProvider } from '../../data_quality_panel/data_quality_context';

interface Props {
  children: React.ReactNode;
}

window.scrollTo = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
export const TestProvidersComponent: React.FC<Props> = ({ children }) => {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockGetInitialConversations = jest.fn(() => ({}));
  const mockGetComments = jest.fn(() => []);
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });

  return (
    <I18nProvider>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <AssistantProvider
          actionTypeRegistry={actionTypeRegistry}
          augmentMessageCodeBlocks={jest.fn()}
          baseAllow={[]}
          baseAllowReplacement={[]}
          defaultAllow={[]}
          defaultAllowReplacement={[]}
          docLinks={{
            ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
            DOC_LINK_VERSION: 'current',
          }}
          getComments={mockGetComments}
          getInitialConversations={mockGetInitialConversations}
          setConversations={jest.fn()}
          setDefaultAllow={jest.fn()}
          setDefaultAllowReplacement={jest.fn()}
          http={mockHttp}
        >
          <DataQualityProvider httpFetch={http.fetch}>{children}</DataQualityProvider>
        </AssistantProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestProvidersComponent.displayName = 'TestProvidersComponent';

export const TestProviders = React.memo(TestProvidersComponent);
