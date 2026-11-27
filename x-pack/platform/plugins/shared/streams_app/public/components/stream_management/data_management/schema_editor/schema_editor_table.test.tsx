/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiSearchBar } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Streams } from '@kbn/streams-schema';
import { FieldsTable } from './schema_editor_table';
import { SchemaEditorContextProvider } from './schema_editor_context';
import type { MappedSchemaField, SchemaEditorProps } from './types';
import type { TControls } from './hooks/use_controls';

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: { start: {} },
    core: { overlays: { openFlyout: jest.fn() } },
    services: {},
  }),
}));

jest.mock('../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({ link: () => '' }),
}));

const streamName = 'logs.test';

const stream = {
  name: streamName,
  description: '',
  updated_at: '2024-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
    settings: {},
    failure_store: { inherit: {} },
    wired: { fields: {}, routing: [] },
  },
} as unknown as Streams.all.Definition;

const createField = (name: string): MappedSchemaField => ({
  name,
  parent: streamName,
  status: 'mapped',
  type: 'keyword',
});

const controls: TControls = {
  query: EuiSearchBar.Query.MATCH_ALL,
  status: [],
  type: [],
};

describe('FieldsTable selection checkboxes', () => {
  it('gives the select-all and per-row checkboxes an accessible name', () => {
    render(
      <IntlProvider>
        <SchemaEditorContextProvider
          {...({
            stream,
            fields: [],
            onFieldUpdate: jest.fn(),
            onFieldsUpdate: jest.fn(),
            isLoading: false,
          } as unknown as SchemaEditorProps)}
        >
          <FieldsTable
            isLoading={false}
            controls={controls}
            defaultColumns={['name', 'type']}
            fields={[createField('attributes.foo'), createField('attributes.bar')]}
            stream={stream}
            withTableActions
            withToolbar={false}
            selectedFields={[]}
            onFieldSelection={jest.fn()}
          />
        </SchemaEditorContextProvider>
      </IntlProvider>
    );

    expect(screen.getByRole('checkbox', { name: 'Select all fields' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row attributes.foo' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row attributes.bar' })).toBeInTheDocument();
  });
});
