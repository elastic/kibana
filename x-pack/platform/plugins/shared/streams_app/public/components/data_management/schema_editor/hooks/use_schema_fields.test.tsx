/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useSchemaFields, getDefinitionFields } from './use_schema_fields';
import type { Streams } from '@kbn/streams-schema';

// Mock the Kibana hook
const mockToasts = {
  addSuccess: jest.fn(),
  addError: jest.fn(),
};

const mockTelemetryClient = {
  trackSchemaUpdated: jest.fn(),
};

const mockStreamsRepositoryClient = {
  fetch: jest.fn(),
};

const mockDataViews = {
  getFieldsForWildcard: jest.fn(),
};

const mockRefreshDefinition = jest.fn();

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        streams: { streamsRepositoryClient: mockStreamsRepositoryClient },
        data: { dataViews: mockDataViews },
      },
    },
    core: {
      notifications: { toasts: mockToasts },
    },
    services: { telemetryClient: mockTelemetryClient },
  }),
}));

// Mock the abort controller hook
jest.mock('@kbn/react-hooks', () => ({
  useAbortController: () => ({
    signal: new AbortController().signal,
    abort: jest.fn(),
    refresh: jest.fn(),
  }),
  useAbortableAsync: jest.fn(() => ({
    value: null,
    loading: false,
    refresh: jest.fn(),
  })),
}));

// Mock useStreamsAppFetch
jest.mock('../../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: jest.fn(() => ({
    value: null,
    loading: false,
    refresh: jest.fn(),
  })),
}));

const renderUseSchemaFields = (definition: Streams.ingest.all.GetResponse) =>
  renderHook(() =>
    useSchemaFields({
      definition,
      refreshDefinition: mockRefreshDefinition,
    })
  );

const waitForFieldsToInitialize = async (
  result: ReturnType<typeof renderUseSchemaFields>['result']
) => {
  await waitFor(() => {
    expect(result.current.fields).toBeDefined();
  });
};

// Import mock definitions from shared mocks
import {
  createMockClassicStreamDefinition,
  createMockWiredStreamDefinition,
  createMockMappedField,
  createMockUnmappedField,
} from '../../shared/mocks';

describe('useSchemaFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshDefinition.mockReset();
    mockStreamsRepositoryClient.fetch.mockReset();
    mockDataViews.getFieldsForWildcard.mockResolvedValue([]);
  });

  describe('Field state management', () => {
    it('initializes with fields from definition', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      expect(result.current.fields).toBeDefined();
      expect(result.current.fields.length).toBeGreaterThan(0);
    });

    it('adds a new field', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const newField = createMockMappedField({
        name: 'attributes.new_field',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.addField(newField);
      });

      expect(result.current.fields).toContainEqual(
        expect.objectContaining({ name: 'attributes.new_field' })
      );
    });

    it('updates an existing field', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const updatedField = createMockMappedField({
        name: 'attributes.test_field',
        type: 'long',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.updateField(updatedField);
      });

      const field = result.current.fields.find((f) => f.name === 'attributes.test_field');
      expect(field).toBeDefined();
      expect(field?.type).toBe('long');
    });

    it('discards changes and resets to stored fields', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const initialFieldsCount = result.current.fields.length;

      const newField = createMockMappedField({
        name: 'attributes.temp_field',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.addField(newField);
      });

      expect(result.current.fields.length).toBe(initialFieldsCount + 1);

      act(() => {
        result.current.discardChanges();
      });

      expect(result.current.fields.length).toBe(initialFieldsCount);
    });
  });

  describe('Pending changes count', () => {
    it('calculates pending changes count correctly', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      expect(result.current.pendingChangesCount).toBe(0);

      const newField = createMockMappedField({
        name: 'attributes.new_field',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.addField(newField);
      });

      expect(result.current.pendingChangesCount).toBe(1);
    });

    it('counts field modifications as pending changes', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const updatedField = createMockMappedField({
        name: 'attributes.test_field',
        type: 'long',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.updateField(updatedField);
      });

      expect(result.current.pendingChangesCount).toBe(1);
    });
  });

  describe('Field status transitions', () => {
    it('transitions field from mapped to unmapped', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const unmappedField = createMockUnmappedField({
        name: 'attributes.test_field',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.updateField(unmappedField);
      });

      const field = result.current.fields.find((f) => f.name === 'attributes.test_field');
      expect(field?.status).toBe('unmapped');
    });
  });

  describe('Submit changes', () => {
    it('calls API with correct payload for classic streams', async () => {
      const definition = createMockClassicStreamDefinition();
      mockStreamsRepositoryClient.fetch.mockResolvedValue({ acknowledged: true });

      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const newField = createMockMappedField({
        name: 'attributes.new_field',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.addField(newField);
      });

      await act(async () => {
        await result.current.submitChanges();
      });

      expect(mockStreamsRepositoryClient.fetch).toHaveBeenLastCalledWith(
        'PUT /api/streams/{name}/_ingest 2023-10-31',
        expect.objectContaining({
          params: expect.objectContaining({
            path: { name: definition.stream.name },
            body: expect.objectContaining({
              ingest: expect.objectContaining({
                classic: expect.objectContaining({
                  field_overrides: expect.objectContaining({
                    'attributes.new_field': expect.objectContaining({ type: 'keyword' }),
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });

    it('calls API with correct payload for wired streams', async () => {
      const definition = createMockWiredStreamDefinition();
      mockStreamsRepositoryClient.fetch.mockResolvedValue({ acknowledged: true });

      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      const newField = createMockMappedField({
        name: 'attributes.new_field',
        parent: definition.stream.name,
      });

      act(() => {
        result.current.addField(newField);
      });

      await act(async () => {
        await result.current.submitChanges();
      });

      expect(mockStreamsRepositoryClient.fetch).toHaveBeenLastCalledWith(
        'PUT /api/streams/{name}/_ingest 2023-10-31',
        expect.objectContaining({
          params: expect.objectContaining({
            path: { name: definition.stream.name },
            body: expect.objectContaining({
              ingest: expect.objectContaining({
                wired: expect.objectContaining({
                  fields: expect.objectContaining({
                    'attributes.new_field': expect.objectContaining({ type: 'keyword' }),
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });

    it('shows success toast on successful submit', async () => {
      const definition = createMockClassicStreamDefinition();
      mockStreamsRepositoryClient.fetch.mockResolvedValue({ acknowledged: true });

      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      await act(async () => {
        await result.current.submitChanges();
      });

      expect(mockToasts.addSuccess).toHaveBeenCalled();
      expect(mockTelemetryClient.trackSchemaUpdated).toHaveBeenCalled();
    });

    it('handles error on submit failure', async () => {
      const definition = createMockClassicStreamDefinition();
      const error = {
        body: { message: 'Failed to update schema' },
      };
      mockStreamsRepositoryClient.fetch.mockRejectedValue(error);

      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      await act(async () => {
        await result.current.submitChanges();
      });

      expect(mockToasts.addError).toHaveBeenCalled();
    });
  });

  describe('Field refresh', () => {
    it('refreshes fields by calling refreshDefinition and refresh functions', async () => {
      const definition = createMockClassicStreamDefinition();
      const { result } = renderUseSchemaFields(definition);
      await waitForFieldsToInitialize(result);

      act(() => {
        result.current.refreshFields();
      });

      expect(mockRefreshDefinition).toHaveBeenCalled();
    });
  });

  describe('getDefinitionFields', () => {
    it('extracts mapped fields from classic stream definition', () => {
      const definition = createMockClassicStreamDefinition();
      const fields = getDefinitionFields(definition);

      expect(fields).toContainEqual(
        expect.objectContaining({
          name: 'attributes.test_field',
          type: 'keyword',
          status: 'mapped',
        })
      );
    });

    it('extracts mapped fields from wired stream definition', () => {
      const definition = createMockWiredStreamDefinition();
      const fields = getDefinitionFields(definition);

      expect(fields).toContainEqual(
        expect.objectContaining({
          name: 'attributes.mapped_field',
          type: 'keyword',
          status: 'mapped',
        })
      );
    });

    it('extracts inherited fields from wired stream definition', () => {
      const definition = createMockWiredStreamDefinition();
      const fields = getDefinitionFields(definition);

      expect(fields).toContainEqual(
        expect.objectContaining({
          name: 'attributes.inherited_field',
          type: 'keyword',
          status: 'inherited',
          parent: 'logs.parent',
        })
      );
    });

    it('handles empty field_overrides for classic streams', () => {
      const definition = createMockClassicStreamDefinition();
      definition.stream.ingest.classic.field_overrides = {};
      const fields = getDefinitionFields(definition);

      expect(fields).toEqual([]);
    });

    it('handles empty fields for wired streams', () => {
      const definition = createMockWiredStreamDefinition();
      definition.stream.ingest.wired.fields = {};
      definition.inherited_fields = {};
      const fields = getDefinitionFields(definition);

      expect(fields).toEqual([]);
    });
  });
});
