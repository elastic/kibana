/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import fixture from '../../services/component_catalogue/catalogue_snapshot/components_v1.json';
import { ProcessorEditor } from './processor_editor';

const mockOpenConfirm = jest.fn();
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ core: { overlays: { openConfirm: mockOpenConfirm } } }),
}));

const catalogue = fixture as ComponentCatalogue;

const savedStep = {
  key: 'step-0',
  status: 'saved' as const,
  processor: {
    id: 'add-fields-1',
    type: 'add_fields',
    supported_telemetry: ['logs' as const],
    config: [
      {
        name: 'fields',
        value: [{ action: 'delete', location: 'attributes', path: 'secret' }],
      },
    ],
  },
};

const renderEditor = (props: Partial<React.ComponentProps<typeof ProcessorEditor>> = {}) => {
  const onCommit = jest.fn();
  const onCancel = jest.fn();
  render(
    <EuiProvider>
      <ProcessorEditor
        catalogue={catalogue}
        telemetry={['logs']}
        componentRefs={[]}
        onCommit={onCommit}
        onCancel={onCancel}
        {...props}
      />
    </EuiProvider>
  );
  return { onCommit, onCancel };
};

const commitPath = (value: string) => {
  const input = screen.getByTestId('componentDefinitionFormPath-path').querySelector('input');
  if (!input) {
    throw new Error('Path combo box rendered without a search input');
  }
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

beforeEach(() => {
  mockOpenConfirm.mockReset();
});

describe('ProcessorEditor', () => {
  it('preselects the only processor and commits its configuration', async () => {
    const { onCommit } = renderEditor();

    expect(screen.getByTestId('componentDefinitionForm-processor-add_fields')).toBeTruthy();
    commitPath('team');
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    expect(onCommit).toHaveBeenCalledWith({
      type: 'add_fields',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'fields',
          value: [{ location: 'record', path: 'team', value: 'core', action: 'upsert' }],
        },
      ],
    });
  });

  it('shows client validation errors instead of committing an incomplete processor', async () => {
    const { onCommit } = renderEditor();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0);
  });

  it('edits an existing processor and keeps its id', async () => {
    const { onCommit } = renderEditor({ step: savedStep });

    expect(screen.queryByTestId('componentDefinitionFormLiteral-value')).toBeNull();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    expect(onCommit).toHaveBeenCalledWith({
      id: 'add-fields-1',
      type: 'add_fields',
      supported_telemetry: ['logs'],
      config: [
        {
          name: 'fields',
          value: [{ location: 'attributes', path: 'secret', action: 'delete' }],
        },
      ],
    });
  });

  it('cancels an untouched editor without asking', async () => {
    const { onCommit, onCancel } = renderEditor();
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCancel'));
    expect(mockOpenConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('asks before discarding edits', async () => {
    mockOpenConfirm.mockResolvedValue(false);
    const { onCancel } = renderEditor();
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCancel'));
    expect(mockOpenConfirm).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does not offer delete while creating a processor', () => {
    renderEditor();
    expect(screen.queryByTestId('streamsProcessingFlyoutEditorDelete')).toBeNull();
  });

  it('does not warn about sharing for a processor only this slot applies', () => {
    renderEditor({ step: savedStep });
    expect(screen.queryByTestId('streamsProcessingFlyoutSharedProcessor')).toBeNull();
  });

  it('warns that edits to a shared processor apply everywhere it is used', () => {
    renderEditor({ step: savedStep, isShared: true });
    expect(screen.getByTestId('streamsProcessingFlyoutSharedProcessor')).toBeTruthy();
  });

  it('enables every supported signal for a new processor with fixed telemetry', async () => {
    const fixedCatalogue: ComponentCatalogue = {
      ...catalogue,
      components: catalogue.components.map((component) =>
        component.type === 'add_fields' ? { ...component, telemetry_selection: 'fixed' } : component
      ),
    };
    const { onCommit } = renderEditor({ catalogue: fixedCatalogue });
    commitPath('team');
    fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
      target: { value: 'core' },
    });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        supported_telemetry: ['logs', 'metrics', 'traces', 'docs', 'profiles'],
      })
    );
  });

  it('deletes an existing processor once confirmed', async () => {
    mockOpenConfirm.mockResolvedValue(true);
    const onDelete = jest.fn();
    renderEditor({ step: savedStep, onDelete });
    await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorDelete'));
    expect(mockOpenConfirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalled();
  });
});
