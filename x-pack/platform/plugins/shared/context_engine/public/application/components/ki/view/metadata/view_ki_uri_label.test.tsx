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
import { ViewKiSidebarUriLabel } from './view_ki_uri_label';

const getUrlForApp = (appId: string, options?: { path?: string }) =>
  `/app/${appId}${options?.path ?? ''}`;

const renderUriLabel = (uri: string) => {
  const services = coreMock.createStart();
  jest.spyOn(services.application, 'getUrlForApp').mockImplementation(getUrlForApp);

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <ViewKiSidebarUriLabel uri={uri} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ViewKiSidebarUriLabel', () => {
  it('renders parsed workflow URI', () => {
    renderUriLabel('workflow://my-wf');

    expect(screen.getByText('workflow')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'my-wf' })).toHaveAttribute(
      'href',
      '/app/workflows/my-wf'
    );
  });

  it('renders parsed tool URI with link', () => {
    renderUriLabel('tool://platform.context_engine.remember');

    expect(screen.getByText('tool')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'platform.context_engine.remember' })).toHaveAttribute(
      'href',
      '/app/agent_builder/manage/tools/platform.context_engine.remember'
    );
  });

  it('renders crawler URI without a link', () => {
    renderUriLabel('crawler://sml');

    expect(screen.getByText('crawler')).toBeInTheDocument();
    expect(screen.getByText('sml')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders unparsed URI', () => {
    renderUriLabel('not-a-uri');

    expect(screen.getByText('not-a-uri')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders Dreaming label for a dreaming workflow URI', () => {
    const dreamingWorkflowId = 'system-context-engine-dreaming-ai-index-1';
    renderUriLabel(`workflow://${dreamingWorkflowId}`);

    expect(screen.getByRole('link', { name: 'Dreaming' })).toHaveAttribute(
      'href',
      `/app/workflows/${dreamingWorkflowId}`
    );
    expect(screen.queryByText('workflow')).not.toBeInTheDocument();
  });

  it('keeps non-dreaming workflow identifier label', () => {
    renderUriLabel('workflow://custom-wf');

    expect(screen.getByRole('link', { name: 'custom-wf' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dreaming' })).not.toBeInTheDocument();
  });
});
