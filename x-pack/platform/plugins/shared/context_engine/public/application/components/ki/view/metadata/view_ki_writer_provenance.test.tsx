/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { KiGovernanceWriter } from './view_ki_document_helpers';
import { ViewKiSidebarWriterProvenance } from './view_ki_writer_provenance';

const getUrlForApp = (appId: string, options?: { path?: string }) =>
  `/app/${appId}${options?.path ?? ''}`;

const renderWriter = (writer: KiGovernanceWriter) => {
  const services = coreMock.createStart();
  jest.spyOn(services.application, 'getUrlForApp').mockImplementation(getUrlForApp);

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <ViewKiSidebarWriterProvenance writer={writer} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ViewKiSidebarWriterProvenance', () => {
  it('renders parsed workflow URI without agent metadata', () => {
    renderWriter({ uri: 'workflow://my-wf', metadata: {} });

    expect(screen.getByText('workflow')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'my-wf' })).toHaveAttribute(
      'href',
      '/app/workflows/my-wf'
    );
    expect(screen.queryByText('agent')).not.toBeInTheDocument();
  });

  it('renders parsed workflow URI with agent metadata', () => {
    renderWriter({
      uri: 'workflow://my-wf',
      metadata: { agent_id: 'elastic-ai-agent' },
    });

    expect(screen.getByRole('link', { name: 'elastic-ai-agent' })).toHaveAttribute(
      'href',
      '/app/agent_builder/manage/agents/elastic-ai-agent'
    );
    expect(screen.getByRole('link', { name: 'my-wf' })).toHaveAttribute(
      'href',
      '/app/workflows/my-wf'
    );
  });

  it('renders unparsed URI without agent metadata', () => {
    renderWriter({ uri: 'not-a-uri', metadata: {} });

    expect(screen.getByText('not-a-uri')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders unparsed URI with agent metadata', () => {
    renderWriter({
      uri: 'not-a-uri',
      metadata: { agent_id: 'elastic-ai-agent' },
    });

    expect(screen.getByRole('link', { name: 'elastic-ai-agent' })).toHaveAttribute(
      'href',
      '/app/agent_builder/manage/agents/elastic-ai-agent'
    );
    expect(screen.getByText('not-a-uri')).toBeInTheDocument();
  });
});
