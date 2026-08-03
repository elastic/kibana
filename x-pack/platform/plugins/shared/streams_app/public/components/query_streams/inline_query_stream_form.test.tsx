/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { InlineQueryStreamForm } from './inline_query_stream_form';
import type { StatefulStreamsAppRouter } from '../../hooks/use_streams_app_router';

const mockRouter: StatefulStreamsAppRouter = {
  link: jest.fn().mockReturnValue('/mock'),
  push: jest.fn(),
  replace: jest.fn(),
  matchRoutes: jest.fn(),
  getParams: jest.fn(),
  getRoutePath: jest.fn(),
  getRoutesToMatch: jest.fn(),
} as StatefulStreamsAppRouter;

jest.mock('../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => mockRouter,
}));

const mockRoutingContext = {
  definition: { stream: { name: 'logs' } },
  routing: [] as Array<{ destination: string; isNew?: boolean }>,
};

jest.mock(
  '../stream_management/data_management/stream_detail_routing/state_management/stream_routing_state_machine',
  () => ({
    useStreamsRoutingSelector: <TSelected,>(
      selector: (snapshot: { context: typeof mockRoutingContext }) => TSelected
    ): TSelected => selector({ context: mockRoutingContext }),
  })
);

jest.mock('../esql_query_editor', () => ({
  StreamsESQLEditor: ({ query }: { query: { esql: string } }) => (
    <div data-test-subj="stubEsqlEditor">{query.esql}</div>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('InlineQueryStreamForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoutingContext.routing = [];
  });

  it('disables the save button when the name has invalid characters (create mode)', () => {
    renderWithProviders(
      <InlineQueryStreamForm
        initialName="My-Query"
        initialEsqlQuery="FROM $.logs"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('does NOT disable the save button in edit mode even if the stream is present in routing', () => {
    mockRoutingContext.routing = [{ destination: 'logs.my-query', isNew: false }];

    renderWithProviders(
      <InlineQueryStreamForm
        initialName="my-query"
        initialEsqlQuery="FROM $.logs"
        nameReadOnly
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).not.toBeDisabled();
  });

  it('disables the save button when the ES|QL query is empty in edit mode', () => {
    mockRoutingContext.routing = [{ destination: 'logs.my-query', isNew: false }];

    renderWithProviders(
      <InlineQueryStreamForm
        initialName="my-query"
        initialEsqlQuery=""
        nameReadOnly
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('disables the save button when the name matches an existing sibling (create mode, duplicate)', () => {
    mockRoutingContext.routing = [{ destination: 'logs.existing', isNew: false }];

    renderWithProviders(
      <InlineQueryStreamForm
        initialName="existing"
        initialEsqlQuery="FROM $.logs"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('disables the save button when the name matches an existing query-stream sibling', () => {
    mockRoutingContext.routing = [];

    renderWithProviders(
      <InlineQueryStreamForm
        initialName="existing-query"
        initialEsqlQuery="FROM $.logs"
        existingSiblingNames={['logs.existing-query']}
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('does not paint the input invalid in edit mode even when the stream is in routing', () => {
    mockRoutingContext.routing = [{ destination: 'logs.my-query', isNew: false }];

    renderWithProviders(
      <InlineQueryStreamForm
        initialName="my-query"
        initialEsqlQuery="FROM $.logs"
        nameReadOnly
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const nameInput = screen.getByTestId('streamsAppRoutingStreamEntryNameField');
    expect(nameInput).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('enables the save button for a valid new name + non-empty ES|QL', () => {
    mockRoutingContext.routing = [];

    renderWithProviders(
      <InlineQueryStreamForm
        initialName="new-query"
        initialEsqlQuery="FROM $.logs"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).not.toBeDisabled();
  });
});
