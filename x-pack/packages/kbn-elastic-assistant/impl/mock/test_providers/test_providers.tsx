/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { ThemeProvider } from 'styled-components';

import { AssistantProvider } from '../../assistant_context';

interface Props {
  children: React.ReactNode;
}

window.scrollTo = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
export const TestProvidersComponent: React.FC<Props> = ({ children }) => {
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
          getComments={mockGetComments}
          getInitialConversations={mockGetInitialConversations}
          setConversations={jest.fn()}
          http={mockHttp}
        >
          {children}
        </AssistantProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestProvidersComponent.displayName = 'TestProvidersComponent';

export const TestProviders = React.memo(TestProvidersComponent);
