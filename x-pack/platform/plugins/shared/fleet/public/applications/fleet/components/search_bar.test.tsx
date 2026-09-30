/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';

import type { FieldSpec } from '@kbn/data-plugin/common';

import { createFleetTestRendererMock } from '../../../mock';

import {
  AGENTS_PREFIX,
  FLEET_ENROLLMENT_API_PREFIX,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
  INGEST_SAVED_OBJECT_INDEX,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../constants';

import { SearchBar, getFieldSpecs } from './search_bar';

const fields = vi.hoisted(() => [
  {
    name: '_id',
    type: 'string',
    esTypes: ['_id'],
  },
  {
    name: 'api_key',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'name',
    type: 'string',
    esTypes: ['keyword'],
  },
  {
    name: 'version',
    type: 'string',
    esTypes: ['keyword'],
  },
]) as FieldSpec[];

vi.mock('../hooks', async () => {
  return {
    ...(await vi.importActual('../hooks')),
    useStartServices: vi.fn().mockReturnValue({
      notifications: {
        toasts: {
          addError: vi.fn(),
          addSuccess: vi.fn(),
        },
      },
      http: {
        basePath: {
          get: () => 'http://localhost:5620',
          prepend: (url: string) => 'http://localhost:5620' + url,
        },
      },
      data: {
        dataViews: {
          create: vi.fn().mockResolvedValue({
            fields,
          }),
        },
      },
      kql: {
        autocomplete: {
          getQuerySuggestions: vi.fn().mockResolvedValue([
            {
              type: 'field',
              field: {
                name: '_id',
                spec: {
                  type: 'string',
                  esTypes: ['_id'],
                },
              },
            },
            {
              type: 'api_key',
              field: {
                name: 'api_key',
                spec: {
                  type: 'string',
                  esTypes: ['api_key'],
                },
              },
            },
            {
              type: 'name',
              field: {
                name: 'name',
                spec: {
                  type: 'string',
                  esTypes: ['name'],
                },
              },
            },
            {
              type: 'version',
              field: {
                name: 'version',
                spec: {
                  type: 'string',
                  esTypes: ['version'],
                },
              },
            },
          ]),
          hasQuerySuggestions: vi.fn().mockReturnValue(true),
        },
      },
      unifiedSearch: {
        ui: {
          IndexPatternSelect: vi.fn(),
          SearchBar: vi.fn().mockReturnValue(null),
          AggregateQuerySearchBar: vi.fn().mockReturnValue(null),
          FiltersBuilderLazy: vi.fn(),
        },
      },
      storage: {
        storage: {
          clear: vi.fn(),
          getItem: vi.fn(),
          key: vi.fn(),
          removeItem: vi.fn(),
          setItem: vi.fn(),
          length: 0,
        },
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
      },
      docLinks: {},
      uiSettings: {
        get: vi.fn(),
      },
      usageCollection: { reportUiCounter: () => {} },
      appName: 'test',
    }),
  };
});

describe('SearchBar', () => {
  const testRenderer = createFleetTestRendererMock();
  const result = testRenderer.render(
    <SearchBar
      value="test-index.name: test"
      onChange={() => undefined}
      fieldPrefix="test-index"
      indexPattern=".test-index"
    />
  );

  it('renders the search box', async () => {
    const textArea = await result.findByTestId('queryInput');
    expect(textArea.getAttribute('placeholder')).toEqual('Filter your data using KQL syntax');
    expect(textArea.getAttribute('aria-label')).toEqual(
      'Start typing to search and filter the Fleet page'
    );
    expect(result?.getByText('test-index.name: test')).toBeInTheDocument();
  });
});

describe('getFieldSpecs', () => {
  it('returns fieldSpecs for Fleet agents', () => {
    expect(getFieldSpecs(AGENTS_INDEX, AGENTS_PREFIX).length).toBeGreaterThan(74);
  });

  it('returns fieldSpecs for Fleet enrollment tokens', () => {
    expect(getFieldSpecs(ENROLLMENT_API_KEYS_INDEX, FLEET_ENROLLMENT_API_PREFIX)).toEqual([
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'active',
        searchable: true,
        type: 'boolean',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'api_key',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'api_key_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'created_at',
        searchable: true,
        type: 'date',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'expire_at',
        searchable: true,
        type: 'date',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'name',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['keyword'],
        name: 'policy_id',
        searchable: true,
        type: 'string',
      },
      {
        aggregatable: true,
        esTypes: ['date'],
        name: 'updated_at',
        searchable: true,
        type: 'date',
      },
      {
        aggregatable: true,
        esTypes: ['boolean'],
        name: 'hidden',
        searchable: true,
        type: 'boolean',
      },
    ]);
  });

  it('returns fieldSpecs for Fleet agent policies', () => {
    expect(getFieldSpecs(INGEST_SAVED_OBJECT_INDEX, LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE)).toEqual(
      [
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.agent_features.name',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['boolean'],
          name: 'ingest-agent-policies.agent_features.enabled',
          searchable: true,
          type: 'boolean',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.data_output_id',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['text'],
          name: 'ingest-agent-policies.description',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.download_source_id',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.download_source_ids',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.fleet_server_host_id',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['integer'],
          name: 'ingest-agent-policies.inactivity_timeout',
          searchable: true,
          type: 'number',
        },
        {
          aggregatable: true,
          esTypes: ['boolean'],
          name: 'ingest-agent-policies.is_default',
          searchable: true,
          type: 'boolean',
        },
        {
          aggregatable: true,
          esTypes: ['boolean'],
          name: 'ingest-agent-policies.is_default_fleet_server',
          searchable: true,
          type: 'boolean',
        },
        {
          aggregatable: true,
          esTypes: ['boolean'],
          name: 'ingest-agent-policies.is_managed',
          searchable: true,
          type: 'boolean',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.is_preconfigured',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['boolean'],
          name: 'ingest-agent-policies.is_protected',
          searchable: true,
          type: 'boolean',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.monitoring_enabled',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['false'],
          name: 'ingest-agent-policies.monitoring_enabled.index',
          searchable: true,
          type: 'false',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.monitoring_output_id',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.name',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.namespace',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['integer'],
          name: 'ingest-agent-policies.revision',
          searchable: true,
          type: 'number',
        },
        {
          aggregatable: true,
          esTypes: ['version'],
          name: 'ingest-agent-policies.schema_version',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.status',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['integer'],
          name: 'ingest-agent-policies.unenroll_timeout',
          searchable: true,
          type: 'number',
        },
        {
          aggregatable: true,
          esTypes: ['date'],
          name: 'ingest-agent-policies.updated_at',
          searchable: true,
          type: 'date',
        },
        {
          aggregatable: true,
          esTypes: ['keyword'],
          name: 'ingest-agent-policies.updated_by',
          searchable: true,
          type: 'string',
        },
        {
          aggregatable: true,
          esTypes: ['boolean'],
          name: 'ingest-agent-policies.supports_agentless',
          searchable: true,
          type: 'boolean',
        },
      ]
    );
  });

  it('returns empty array if indexPattern is not one of the previous', async () => {
    expect(getFieldSpecs(INGEST_SAVED_OBJECT_INDEX, PACKAGE_POLICY_SAVED_OBJECT_TYPE)).toEqual([]);
  });
});
