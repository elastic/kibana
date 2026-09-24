/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { EditSourcesFlyout } from './edit_sources_flyout';

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (query: { esql: string }) => void;
  }) => (
    <textarea
      data-test-subj="mockEsqlEditor"
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM My view' }],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const createServices = () => ({
  ...coreMock.createStart(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
});

const renderFlyout = (index: GetAiIndexResponse = aiIndex) => {
  const onClose = jest.fn();
  const onSaved = jest.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const services = createServices();

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <EditSourcesFlyout aiIndex={index} onClose={onClose} onSaved={onSaved} />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { onClose, onSaved };
};

const saveButton = () => screen.getByTestId('contextEditSourcesDoneButton');

const addEsqlSource = (query: string) => {
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
};

describe('EditSourcesFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables Save when the current selection matches the sources loaded on open', async () => {
    renderFlyout();

    expect(await screen.findByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('enables Save after adding a source and disables it again when the selection is reverted', async () => {
    renderFlyout({ ...aiIndex, sources: [] });

    expect(saveButton()).toBeDisabled();

    addEsqlSource('FROM logs-* | LIMIT 10');
    expect(saveButton()).toBeEnabled();

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });
});
