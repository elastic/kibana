/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { AddFieldFlyout } from './add_field_flyout';
import {
  createMockClassicStreamDefinition,
  createMockWiredStreamDefinition,
} from '../../shared/mocks';
import { SchemaEditorContextProvider } from '../schema_editor_context';

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {
      docLinks: {
        links: {
          elasticsearch: {
            mappingParameters: 'https://elastic.co/docs/mapping-parameters',
          },
        },
      },
    },
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: jest.fn(),
          },
        },
        fieldsMetadata: {
          useFieldsMetadata: () => ({
            fieldsMetadata: {},
            loading: false,
          }),
        },
      },
    },
  }),
}));

jest.mock('../../../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({
    link: jest.fn(() => '/mock-link'),
  }),
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-testid="mock-code-editor">CodeEditor</div>,
}));

const renderAddFieldFlyout = (
  streamType: 'wired' | 'classic',
  existingFieldNames: string[] = []
) => {
  const definition =
    streamType === 'wired'
      ? createMockWiredStreamDefinition()
      : createMockClassicStreamDefinition();

  const fields = existingFieldNames.map((name) => ({
    name,
    type: 'keyword' as const,
    parent: definition.stream.name,
    status: 'mapped' as const,
  }));

  const onClose = jest.fn();
  const onAddField = jest.fn();

  return {
    onClose,
    onAddField,
    ...render(
      <I18nProvider>
        <SchemaEditorContextProvider
          stream={definition.stream}
          fields={fields}
          isLoading={false}
          withFieldSimulation={false}
          onFieldUpdate={jest.fn()}
          onFieldSelection={jest.fn()}
          fieldSelection={[]}
        >
          <AddFieldFlyout onClose={onClose} onAddField={onAddField} />
        </SchemaEditorContextProvider>
      </I18nProvider>
    ),
  };
};

const typeFieldName = async (user: ReturnType<typeof userEvent.setup>, fieldName: string) => {
  const comboBox = screen.getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName');
  const input = comboBox.querySelector('input');
  if (!input) throw new Error('Could not find input element');
  await user.clear(input);
  await user.type(input, fieldName);
  await user.keyboard('{Enter}');
};

const getFieldNameError = () => {
  const formRow = screen
    .getByTestId('streamsAppSchemaEditorAddFieldFlyoutFieldName')
    .closest('.euiFormRow');
  return formRow?.querySelector('.euiFormErrorText')?.textContent ?? null;
};

describe('AddFieldFlyout', () => {
  describe('Field name validation for wired streams', () => {
    it('shows error for non-namespaced field names', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'invalid_field');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain(
          "Field invalid_field is not allowed to be defined as it doesn't match the namespaced ECS or OTel schema"
        );
      });
    });

    it('shows error for OTel reserved field names that are also not namespaced (message)', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      // `message` is not in keepFields and doesn't start with namespace prefix,
      // so it fails the namespacing check first (matching server-side behavior)
      await typeFieldName(user, 'message');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain("doesn't match the namespaced ECS or OTel schema");
      });
    });

    it('shows error for OTel reserved fields that are also not namespaced (trace.id)', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      // `trace.id` is not in keepFields and doesn't start with namespace prefix,
      // so it fails the namespacing check first
      await typeFieldName(user, 'trace.id');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain("doesn't match the namespaced ECS or OTel schema");
      });
    });

    it('shows error for body passthrough object (which is in keepFields)', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      // `body` IS in keepFields, so it passes the namespacing check,
      // but then fails the OTel reserved check
      await typeFieldName(user, 'body');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain('automatic alias');
      });
    });

    it('shows error for attributes passthrough object (not in keepFields)', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      // `attributes` is not in keepFields and doesn't start with namespace prefix,
      // so it fails the namespacing check first
      await typeFieldName(user, 'attributes');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain("doesn't match the namespaced ECS or OTel schema");
      });
    });

    it('allows namespaced field names with attributes prefix', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'attributes.custom_field');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });

    it('allows namespaced field names with body.structured prefix', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'body.structured.data');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });

    it('allows namespaced field names with resource.attributes prefix', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'resource.attributes.host.name');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });

    it('allows keepFields like @timestamp', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, '@timestamp');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });

    it('allows keepFields like trace_id', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'trace_id');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });
  });

  describe('Field name validation for classic streams', () => {
    it('allows non-namespaced field names', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('classic');

      await typeFieldName(user, 'custom_field');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });

    it('allows OTel reserved field names', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('classic');

      await typeFieldName(user, 'message');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toBeNull();
      });
    });
  });

  describe('Common validation for all stream types', () => {
    it('shows error for duplicate field names in wired streams', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired', ['attributes.existing_field']);

      await typeFieldName(user, 'attributes.existing_field');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain('A field with this name already exists');
      });
    });

    it('shows error for duplicate field names in classic streams', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('classic', ['existing_field']);

      await typeFieldName(user, 'existing_field');

      await waitFor(() => {
        const error = getFieldNameError();
        expect(error).toContain('A field with this name already exists');
      });
    });
  });

  describe('Add field button state', () => {
    it('disables the Add field button when field name validation fails', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'invalid_field');

      await waitFor(() => {
        const addFieldButton = screen.getByTestId('streamsAppSchemaEditorAddFieldButton');
        expect(addFieldButton).toBeDisabled();
      });
    });

    it('disables the Add field button when field name is valid but type is not selected', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'attributes.custom_field');

      await waitFor(() => {
        const addFieldButton = screen.getByTestId('streamsAppSchemaEditorAddFieldButton');
        expect(addFieldButton).toBeDisabled();
      });
    });

    it('enables the Add field button when all required fields are valid', async () => {
      const user = userEvent.setup();
      renderAddFieldFlyout('wired');

      await typeFieldName(user, 'attributes.custom_field');
      const typeSelect = screen.getByTestId('streamsAppFieldFormTypeSelect');
      await user.click(typeSelect);
      const keywordOption = screen.getByTestId('option-type-keyword');
      await user.click(keywordOption);

      await waitFor(() => {
        const addFieldButton = screen.getByTestId('streamsAppSchemaEditorAddFieldButton');
        expect(addFieldButton).not.toBeDisabled();
      });
    });
  });
});
