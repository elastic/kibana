/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { InlineQueryStreamForm } from './inline_query_stream_form';
import type { StatefulStreamsAppRouter } from '../../hooks/use_streams_app_router';

const mockRouter: StatefulStreamsAppRouter = {
  link: vi.fn().mockReturnValue('/mock'),
  push: vi.fn(),
  replace: vi.fn(),
  matchRoutes: vi.fn(),
  getParams: vi.fn(),
  getRoutePath: vi.fn(),
  getRoutesToMatch: vi.fn(),
} as StatefulStreamsAppRouter;

vi.mock('../../hooks/use_streams_app_router', () => {
      const mocked = {
      useStreamsAppRouter: () => mockRouter,
    };
      return { ...mocked, default: mocked };
    });

const mockRoutingContext = {
  definition: { stream: { name: 'logs' } },
  routing: [] as Array<{ destination: string; isNew?: boolean }>,
};

vi.mock(
  '../stream_management/data_management/stream_detail_routing/state_management/stream_routing_state_machine',
  () => {
      const mocked = {
        useStreamsRoutingSelector: <TSelected,>(
          selector: (snapshot: { context: typeof mockRoutingContext }) => TSelected
        ): TSelected => selector({ context: mockRoutingContext }),
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('../esql_query_editor', () => {
      const mocked = {
      StreamsESQLEditor: ({ query }: { query: { esql: string } }) => (
        <div data-test-subj="stubEsqlEditor">{query.esql}</div>
      ),
    };
      return { ...mocked, default: mocked };
    });

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('InlineQueryStreamForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoutingContext.routing = [];
  });

  it('disables the save button when the name has invalid characters (create mode)', () => {
    renderWithProviders(
      <InlineQueryStreamForm
        initialName="My-Query"
        initialEsqlQuery="FROM $.logs"
        onSave={vi.fn()}
        onCancel={vi.fn()}
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
        onSave={vi.fn()}
        onCancel={vi.fn()}
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
        onSave={vi.fn()}
        onCancel={vi.fn()}
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
        onSave={vi.fn()}
        onCancel={vi.fn()}
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
        onSave={vi.fn()}
        onCancel={vi.fn()}
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
        onSave={vi.fn()}
        onCancel={vi.fn()}
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
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFormSaveButton');
    expect(saveButton).not.toBeDisabled();
  });
});
