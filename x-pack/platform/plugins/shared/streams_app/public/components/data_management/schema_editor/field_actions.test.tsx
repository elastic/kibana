/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

// Setup userEvent with pointerEventsCheck disabled to avoid issues with EUI animation
const user = userEvent.setup({ pointerEventsCheck: 0 });
import { FieldActionsCell } from './field_actions';
import { SchemaEditorContextProvider } from './schema_editor_context';
import type {
  MappedSchemaField,
  UnmappedSchemaField,
  SchemaEditorField,
  SchemaEditorProps,
} from './types';

// Mock the Kibana hook
const mockOverlaysOpenFlyout = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {},
    },
    core: {
      overlays: {
        openFlyout: mockOverlaysOpenFlyout,
      },
      i18n: { Context: ({ children }: { children: React.ReactNode }) => children },
      theme: { theme$: { subscribe: () => ({ unsubscribe: () => {} }) } },
    },
    services: {},
  }),
}));

const createMockWiredStream = (name: string) =>
  ({
    name,
    description: '',
    updated_at: '2024-01-01T00:00:00.000Z',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: '2024-01-01T00:00:00.000Z' },
      settings: {},
      failure_store: { inherit: {} },
      wired: {
        fields: {},
        routing: [],
      },
    },
  } as unknown as SchemaEditorProps['stream']);

const renderWithContext = (
  field: SchemaEditorField,
  fields: SchemaEditorField[] = [field],
  contextOverrides: Partial<SchemaEditorProps> = {}
) => {
  const mockOnFieldUpdate = jest.fn();
  const mockOnAddField = jest.fn();
  const mockOnFieldSelection = jest.fn();

  const contextProps: SchemaEditorProps = {
    fields,
    onFieldUpdate: mockOnFieldUpdate,
    onAddField: mockOnAddField,
    onFieldSelection: mockOnFieldSelection,
    fieldSelection: [],
    stream: createMockWiredStream('logs.test'),
    withFieldSimulation: false,
    enableGeoPointSuggestions: false,
    ...contextOverrides,
  };

  const renderResult = render(
    <IntlProvider>
      <SchemaEditorContextProvider {...contextProps}>
        <FieldActionsCell field={field} />
      </SchemaEditorContextProvider>
    </IntlProvider>
  );

  return {
    ...renderResult,
    mockOnFieldUpdate,
    mockOnAddField,
  };
};

const openActionsMenu = async () => {
  const button = screen.getByTestId('streamsAppActionsButton');
  await user.click(button);
  // Wait for the context menu panel to appear
  await waitFor(() => {
    expect(screen.getByTestId('contextMenuPanelTitle')).toBeInTheDocument();
  });
};

const getMenuItemNames = () => {
  // EuiContextMenu items are buttons with class euiContextMenuItem, excluding the title and actions button
  const menuItems = screen.getAllByRole('button').filter((button) => {
    const isContextMenuItem = button.classList.contains('euiContextMenuItem');
    const isTitle = button.getAttribute('data-test-subj') === 'contextMenuPanelTitle';
    const isActionsButton = button.getAttribute('data-test-subj') === 'streamsAppActionsButton';
    return isContextMenuItem && !isTitle && !isActionsButton;
  });
  return menuItems.map((item) => item.textContent);
};

describe('FieldActionsCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOverlaysOpenFlyout.mockReturnValue({ close: jest.fn() });
  });

  describe('system fields', () => {
    it('should not render actions button for system type fields', () => {
      const systemField: MappedSchemaField = {
        name: '@timestamp',
        parent: 'logs',
        status: 'mapped',
        type: 'system',
      };

      renderWithContext(systemField as SchemaEditorField);

      expect(screen.queryByTestId('streamsAppActionsButton')).not.toBeInTheDocument();
    });
  });

  describe('mapped fields', () => {
    it('should show View, Edit, and Unmap actions for regular mapped fields', async () => {
      const mappedField: MappedSchemaField = {
        name: 'message',
        parent: 'logs.test',
        status: 'mapped',
        type: 'keyword',
      };

      renderWithContext(mappedField as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field');
      expect(actions).toContain('Unmap field');
      expect(actions).not.toContain('Clear description');
    });

    it('should show Clear description action when field has description', async () => {
      const mappedFieldWithDescription: MappedSchemaField = {
        name: 'message',
        parent: 'logs.test',
        status: 'mapped',
        type: 'keyword',
        description: 'A test description',
      };

      renderWithContext(mappedFieldWithDescription as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('Clear description');
    });

    it('should NOT show Unmap action for documentation-only fields (type === unmapped)', async () => {
      // Documentation-only field: status: 'mapped', type: 'unmapped'
      const documentationOnlyField: MappedSchemaField = {
        name: 'attributes.documented_field',
        parent: 'logs.test',
        status: 'mapped',
        type: 'unmapped',
        description: 'This field is documented but not mapped',
      };

      renderWithContext(documentationOnlyField as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field');
      expect(actions).toContain('Clear description');
      expect(actions).not.toContain('Unmap field');
    });

    it('should NOT show Unmap action for fields that are mapped in parent', async () => {
      // Field that overrides a parent field - should not have "Unmap" because parent's mapping still applies
      const mappedField: MappedSchemaField = {
        name: 'attributes.field1',
        parent: 'logs.test',
        status: 'mapped',
        type: 'keyword',
        description: 'Local description',
      };

      const inheritedField: MappedSchemaField = {
        name: 'attributes.field1',
        parent: 'logs',
        status: 'inherited',
        type: 'keyword',
      };

      // Both fields in the list - this means the mapped one is overriding the inherited one
      renderWithContext(mappedField as SchemaEditorField, [
        mappedField as SchemaEditorField,
        inheritedField as SchemaEditorField,
      ]);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field');
      expect(actions).not.toContain('Unmap field');
    });

    it('should call onFieldUpdate without description when Clear description is clicked', async () => {
      const fieldWithDescription: MappedSchemaField = {
        name: 'message',
        parent: 'logs.test',
        status: 'mapped',
        type: 'keyword',
        description: 'A test description',
      };

      const { mockOnFieldUpdate } = renderWithContext(fieldWithDescription as SchemaEditorField);
      await openActionsMenu();

      const clearDescriptionButton = screen.getByRole('button', { name: 'Clear description' });
      await user.click(clearDescriptionButton);

      expect(mockOnFieldUpdate).toHaveBeenCalledWith({
        name: 'message',
        parent: 'logs.test',
        status: 'mapped',
        type: 'keyword',
        // description should NOT be included
      });
      expect(mockOnFieldUpdate.mock.calls[0][0]).not.toHaveProperty('description');
    });
  });

  describe('unmapped fields', () => {
    it('should show View and Edit actions for unmapped fields', async () => {
      const unmappedField: UnmappedSchemaField = {
        name: 'custom_field',
        parent: 'logs.test',
        status: 'unmapped',
      };

      renderWithContext(unmappedField as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field');
      expect(actions).not.toContain('Clear description');
    });

    it('should show Clear description action when unmapped field has description', async () => {
      const unmappedFieldWithDescription: UnmappedSchemaField = {
        name: 'custom_field',
        parent: 'logs.test',
        status: 'unmapped',
        description: 'A description for unmapped field',
      };

      renderWithContext(unmappedFieldWithDescription as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('Clear description');
    });

    it('should NOT show geo mapping action when field has a real mapping in parent', async () => {
      // Unmapped field with same name as inherited field with a real type - parent's mapping applies
      const unmappedField: UnmappedSchemaField = {
        name: 'attributes.field1',
        parent: 'logs.test',
        status: 'unmapped',
      };

      const inheritedField: MappedSchemaField = {
        name: 'attributes.field1',
        parent: 'logs',
        status: 'inherited',
        type: 'keyword',
      };

      renderWithContext(unmappedField as SchemaEditorField, [
        unmappedField as SchemaEditorField,
        inheritedField as SchemaEditorField,
      ]);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field');
      expect(actions).not.toContain('Map as geo field');
    });

    it('should show Edit action when parent has type: unmapped', async () => {
      // When parent has type: 'unmapped' (documentation-only), child should be able to map it
      const unmappedField: UnmappedSchemaField = {
        name: 'attributes.field1',
        parent: 'logs.test',
        status: 'unmapped',
      };

      const inheritedUnmappedField: MappedSchemaField = {
        name: 'attributes.field1',
        parent: 'logs',
        status: 'inherited',
        type: 'unmapped',
        description: 'Parent documentation',
      };

      renderWithContext(unmappedField as SchemaEditorField, [
        unmappedField as SchemaEditorField,
        inheritedUnmappedField as SchemaEditorField,
      ]);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field'); // Should show because parent only has documentation, not real mapping
    });

    it('should call onFieldUpdate without description when Clear description is clicked', async () => {
      const fieldWithDescription: UnmappedSchemaField = {
        name: 'custom_field',
        parent: 'logs.test',
        status: 'unmapped',
        description: 'Field description',
      };

      const { mockOnFieldUpdate } = renderWithContext(fieldWithDescription as SchemaEditorField);
      await openActionsMenu();

      const clearDescriptionButton = screen.getByRole('button', { name: 'Clear description' });
      await user.click(clearDescriptionButton);

      expect(mockOnFieldUpdate).toHaveBeenCalledWith({
        name: 'custom_field',
        parent: 'logs.test',
        status: 'unmapped',
        // description should NOT be included
      });
      expect(mockOnFieldUpdate.mock.calls[0][0]).not.toHaveProperty('description');
    });
  });

  describe('inherited fields', () => {
    it('should show View and Edit actions for inherited fields', async () => {
      const inheritedField: MappedSchemaField = {
        name: 'attributes.inherited_field',
        parent: 'logs',
        status: 'inherited',
        type: 'keyword',
      };

      renderWithContext(inheritedField as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('View field');
      expect(actions).toContain('Edit field');
      expect(actions).not.toContain('Unmap field');
      expect(actions).not.toContain('Map field');
      expect(actions).not.toContain('Clear description');
    });

    it('should show Clear description action when inherited field has description', async () => {
      const inheritedFieldWithDescription: MappedSchemaField = {
        name: 'attributes.inherited_field',
        parent: 'logs',
        status: 'inherited',
        type: 'keyword',
        description: 'Description added locally',
      };

      renderWithContext(inheritedFieldWithDescription as SchemaEditorField);
      await openActionsMenu();

      const actions = getMenuItemNames();
      expect(actions).toContain('Clear description');
    });

    it('should call onFieldUpdate without description when Clear description is clicked', async () => {
      const fieldWithDescription: MappedSchemaField = {
        name: 'attributes.inherited_field',
        parent: 'logs',
        status: 'inherited',
        type: 'keyword',
        description: 'Local description',
      };

      const { mockOnFieldUpdate } = renderWithContext(fieldWithDescription as SchemaEditorField);
      await openActionsMenu();

      const clearDescriptionButton = screen.getByRole('button', { name: 'Clear description' });
      await user.click(clearDescriptionButton);

      expect(mockOnFieldUpdate).toHaveBeenCalledWith({
        name: 'attributes.inherited_field',
        parent: 'logs',
        status: 'inherited',
        type: 'keyword',
        // description should NOT be included
      });
      expect(mockOnFieldUpdate.mock.calls[0][0]).not.toHaveProperty('description');
    });
  });
});
