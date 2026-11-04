/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import { AI_INDEX_CREATED_LOCATION_STATE } from '../ai_index_created_location_state';
import { CONTEXT_ENGINE_PATHS, getAiIndexDreamingTemplatePath } from '../paths';
import { createAppChromeMock } from '../test_utils/app_chrome_mock';
import { DreamingTemplatePage } from './dreaming_template_page';

const INDEX = {
  templates: [
    { id: 'customer_support', name: 'Customer support', description: 'Tickets and docs.' },
    { id: 'legal_assistant', name: 'Legal assistant', description: 'Contracts.' },
  ],
};

const SUPPORT = {
  summary: 'Customer support knowledge base.',
  rationale: 'Support knowledge centers on issues.',
  dreaming: {
    instructions: 'Record confirmed fixes.',
    facts: [{ type: 'solution', description: 'A confirmed fix.' }],
    entities: {
      nodes: [{ type: 'issue', description: 'A known problem.', attributes: ['severity'] }],
      edges: [{ type: 'duplicate_of', source: 'issue', target: 'issue' }],
    },
  },
};

const LEGAL = {
  summary: 'Legal knowledge.',
  rationale: 'Rules and the documents that apply them.',
  dreaming: {
    instructions: 'Record obligations.',
    facts: [{ type: 'obligation' }],
    entities: {
      nodes: [{ type: 'contract' }],
      edges: [{ type: 'supersedes', source: 'contract', target: 'contract' }],
    },
  },
};

const renderPage = () => {
  const services = coreMock.createStart();
  jest
    .mocked(services.http.staticAssets.getPluginAssetHref)
    .mockImplementation((path) => `/assets/${path}`);
  services.http.get.mockImplementation((async (path: string) => {
    if (path === '/assets/dreaming_templates/index.json') return INDEX;
    if (path === '/assets/dreaming_templates/customer_support.json') return SUPPORT;
    if (path === '/assets/dreaming_templates/legal_assistant.json') return LEGAL;
    throw new Error(`unexpected ${path}`);
  }) as typeof services.http.get);
  services.http.put.mockResolvedValue({ dreaming: { enabled: true } });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ChromeServiceProvider value={{ chrome: services.chrome }}>
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider
            services={{
              ...services,
              history: scopedHistoryMock.create(),
              appChrome: createAppChromeMock(),
            }}
          >
            <QueryClientProvider client={queryClient}>
              <MemoryRouter initialEntries={[getAiIndexDreamingTemplatePath('tickets')]}>
                <Route
                  path={CONTEXT_ENGINE_PATHS.dreamingTemplate}
                  exact
                  component={DreamingTemplatePage}
                />
              </MemoryRouter>
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    </ChromeServiceProvider>
  );
  return services;
};

const continuedToAiIndex = {
  path: '/ai_index/tickets',
  state: AI_INDEX_CREATED_LOCATION_STATE,
};

const pickedExample = async () =>
  waitFor(() =>
    expect(screen.getByTestId('contextDreamingConfigFact-solution')).toBeInTheDocument()
  );

const putBody = (services: ReturnType<typeof renderPage>) =>
  JSON.parse(((services.http.put.mock.calls[0] as unknown[])[1] as { body: string }).body);

describe('DreamingTemplatePage', () => {
  it('lists the examples and Custom, starting from the first, with its facts and entities off', async () => {
    const services = renderPage();

    expect(
      await screen.findByTestId('contextDreamingTemplateOption-legal_assistant')
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('contextDreamingTemplateOption-customer_support')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('contextDreamingTemplateOption-custom')).toBeInTheDocument();
    await pickedExample();
    expect(screen.getByTestId('contextDreamingTemplateSummary')).toHaveValue(
      'Customer support knowledge base.'
    );
    expect(screen.getByTestId('contextDreamingConfigEntitiesSwitch')).not.toBeChecked();
    expect(screen.queryByTestId('contextDreamingConfigEntities')).not.toBeInTheDocument();
    expect(services.http.get).toHaveBeenCalledWith(
      '/assets/dreaming_templates/index.json',
      expect.objectContaining({ prependBasePath: false })
    );
  });

  it('keeps an edited description until another example is picked', async () => {
    renderPage();
    await pickedExample();

    fireEvent.change(screen.getByTestId('contextDreamingTemplateSummary'), {
      target: { value: 'Acme support.' },
    });
    expect(screen.getByTestId('contextDreamingTemplateSummary')).toHaveValue('Acme support.');

    fireEvent.click(screen.getByTestId('contextDreamingTemplateOption-legal_assistant'));
    await waitFor(() =>
      expect(screen.getByTestId('contextDreamingTemplateSummary')).toHaveValue('Legal knowledge.')
    );
    expect(screen.getByTestId('contextDreamingConfigFact-obligation')).toBeInTheDocument();
  });

  it('turns dreaming on with the facts only while entities are off', async () => {
    const services = renderPage();
    await pickedExample();

    fireEvent.change(screen.getByTestId('contextDreamingTemplateSummary'), {
      target: { value: 'Acme customer support knowledge base.' },
    });
    fireEvent.click(screen.getByTestId('contextDreamingTemplateSave'));

    await waitFor(() =>
      expect(services.application.navigateToApp).toHaveBeenCalledWith(
        CONTEXT_ENGINE_APP_ID,
        continuedToAiIndex
      )
    );
    expect(services.http.put).toHaveBeenCalledWith(
      '/api/context_engine/ai_index/tickets/_dreaming',
      expect.objectContaining({ version: '2023-10-31' })
    );
    expect(putBody(services)).toEqual({
      enabled: true,
      instructions: 'Acme customer support knowledge base.\n\nRecord confirmed fixes.',
      facts: SUPPORT.dreaming.facts,
      entities: null,
    });
  });

  it('suggests the example’s entities and relationships when they are turned on, and saves them', async () => {
    const services = renderPage();
    await pickedExample();

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntitiesSwitch'));
    expect(screen.getByTestId('contextDreamingConfigEntity-issue')).toHaveTextContent('severity');
    expect(screen.getByTestId('contextDreamingConfigRelationship-duplicate_of')).toHaveTextContent(
      'issue → issue'
    );
    fireEvent.click(screen.getByTestId('contextDreamingTemplateSave'));

    await waitFor(() => expect(services.http.put).toHaveBeenCalled());
    expect(putBody(services).entities).toEqual(SUPPORT.dreaming.entities);
  });

  it('starts Custom empty, and turns dreaming on once a fact type is added', async () => {
    const services = renderPage();
    await pickedExample();

    fireEvent.click(screen.getByTestId('contextDreamingTemplateOption-custom'));
    expect(screen.getByTestId('contextDreamingTemplateSummary')).toHaveValue('');
    expect(screen.getByTestId('contextDreamingConfigFacts-empty')).toBeInTheDocument();
    expect(screen.getByTestId('contextDreamingTemplateSave')).toBeDisabled();

    fireEvent.click(screen.getByTestId('contextDreamingConfigFacts-add'));
    fireEvent.change(screen.getByTestId('contextDreamingTypeModalName'), {
      target: { value: 'Incident Cause' },
    });
    fireEvent.click(screen.getByTestId('contextDreamingTypeModalSave'));
    expect(screen.getByTestId('contextDreamingConfigFact-incident_cause')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('contextDreamingTemplateSummary'), {
      target: { value: 'Incident reviews.' },
    });
    fireEvent.click(screen.getByTestId('contextDreamingTemplateSave'));

    await waitFor(() => expect(services.http.put).toHaveBeenCalled());
    expect(putBody(services)).toEqual({
      enabled: true,
      facts: [{ type: 'incident_cause' }],
      entities: null,
      instructions: 'Incident reviews.',
    });
  });

  it('stays on the page when saving fails', async () => {
    const services = renderPage();
    services.http.put.mockRejectedValue(new Error('Forbidden'));
    await pickedExample();

    fireEvent.click(screen.getByTestId('contextDreamingTemplateSave'));

    await waitFor(() => expect(services.notifications.toasts.addError).toHaveBeenCalled());
    expect(services.application.navigateToApp).not.toHaveBeenCalled();
  });

  it('skips to the AI index without saving', async () => {
    const services = renderPage();

    fireEvent.click(await screen.findByTestId('contextDreamingTemplateSkip'));

    expect(services.http.put).not.toHaveBeenCalled();
    expect(services.application.navigateToApp).toHaveBeenCalledWith(
      CONTEXT_ENGINE_APP_ID,
      continuedToAiIndex
    );
  });
});
