/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createActor, createMachine } from 'xstate';
import type { ProcessingNodeRef } from '../../services/unit_graph';
import type { Unit } from '../../services/unit_repository';
import { singleProcessorCatalogue } from '../component_definition_form/test_helpers';
import { ProcessingFlyout } from '.';
import { processingFlyoutMachine } from './state_management/processing_flyout_machine';

const mockCloseProcessingFlyout = jest.fn();
const mockOpenConfirm = jest.fn();
const mockFetch = jest.fn();
const emptyUnit: Unit = {
  unit: { sources: [], destinations: [], pipelines: [] },
  ui_metadata: {},
};
const mockStagedUnit = { current: emptyUnit };
const mockSavedUnit = { current: emptyUnit };
const mockCatalogue = singleProcessorCatalogue('set');

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { overlays: { openConfirm: mockOpenConfirm } },
    dependencies: { start: { streams: { streamsRepositoryClient: { fetch: mockFetch } } } },
  }),
}));

jest.mock('../../services/component_catalogue', () => ({
  ...jest.requireActual('../../services/component_catalogue'),
  useComponentCatalogue: () => ({
    catalogue: mockCatalogue,
    editableCatalogue: mockCatalogue,
  }),
}));

jest.mock('../stream_management/data_management/stream_detail_canvas/state_management', () => ({
  useCanvasEvents: () => ({ closeProcessingFlyout: mockCloseProcessingFlyout }),
  useCanvasUnitDefinition: () => mockStagedUnit.current,
  useCanvasPersistedUnit: () => mockSavedUnit.current,
}));

const slot: ProcessingNodeRef = { kind: 'pipeline', pipelineId: 'p-source' };

const renderFlyout = ({
  isSlotUnsaved,
  initialCreate = true,
}: {
  isSlotUnsaved: boolean;
  initialCreate?: boolean;
}) => {
  const parentRef = createActor(createMachine({})).start();
  const ref = createActor(processingFlyoutMachine, {
    input: {
      slot,
      telemetry: ['logs'],
      processors: mockStagedUnit.current.unit.processors ?? [],
      editable: true,
      initialCreate: initialCreate ? { position: 'start' } : undefined,
      parentRef,
    },
  }).start();
  const flyout = { slot, ref };
  render(
    <EuiProvider>
      <ProcessingFlyout flyout={flyout} readOnly={false} isSlotUnsaved={isSlotUnsaved} />
    </EuiProvider>
  );
};

beforeEach(() => {
  mockCloseProcessingFlyout.mockReset();
  mockOpenConfirm.mockReset().mockResolvedValue(false);
  mockFetch.mockReset().mockResolvedValue({ valid: true, diagnostics: [] });
  mockSavedUnit.current = emptyUnit;
  mockStagedUnit.current = emptyUnit;
});

it('opens an unsaved connection read-only even when opened to add processing', () => {
  renderFlyout({ isSlotUnsaved: true });

  const callout = screen.getByTestId('streamsProcessingFlyoutUnsavedSlot');
  expect(callout).toHaveTextContent('Save the map first');
  expect(screen.getByText('Read only')).toBeInTheDocument();
  expect(screen.queryByTestId('streamsProcessingFlyoutNewStep')).not.toBeInTheDocument();
  expect(screen.getByTestId('streamsProcessingFlyoutEmptyAddProcessor')).toBeDisabled();
  expect(screen.getByTestId('streamsProcessingFlyoutSave')).toBeDisabled();

  fireEvent.click(screen.getByTestId('streamsProcessingFlyoutClose'));
  expect(mockCloseProcessingFlyout).toHaveBeenCalledTimes(1);
  expect(mockOpenConfirm).not.toHaveBeenCalled();
});

it('blocks editing the shared processor while allowing an independent processor', () => {
  const savedPipeline: Unit['unit']['pipelines'][number] = {
    id: slot.pipelineId,
    supported_telemetry: ['logs'],
    config: [
      { name: 'processors', value: ['shared'] },
      { name: 'destinations', value: ['es'] },
    ],
  };
  const otherPipeline = { ...savedPipeline, id: 'other' };
  const stagedOtherPipeline: Unit['unit']['pipelines'][number] = {
    ...otherPipeline,
    config: [{ name: 'processors', value: ['shared'] }],
  };
  mockSavedUnit.current = {
    ...emptyUnit,
    unit: {
      ...emptyUnit.unit,
      processors: [{ id: 'shared', type: 'set', supported_telemetry: ['logs'] }],
      pipelines: [savedPipeline, otherPipeline],
    },
  };
  mockStagedUnit.current = {
    ...mockSavedUnit.current,
    unit: { ...mockSavedUnit.current.unit, pipelines: [savedPipeline, stagedOtherPipeline] },
  };
  renderFlyout({ isSlotUnsaved: false, initialCreate: false });

  expect(screen.getByTestId('streamsProcessingFlyoutStepTitle')).toBeDisabled();
  expect(
    screen.getByText(
      'Other connections using this processing have unsaved changes. Save the map before editing the shared processors.'
    )
  ).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('streamsProcessingFlyoutAddProcessor'));
  expect(screen.getByTestId('streamsProcessingFlyoutNewStep')).toBeInTheDocument();
});

it('checks a new processor under an ID that is free in both the saved and staged units', async () => {
  mockSavedUnit.current = {
    ...emptyUnit,
    unit: {
      ...emptyUnit.unit,
      processors: [{ id: 'set-1', type: 'set', supported_telemetry: ['logs'] }],
    },
  };
  renderFlyout({ isSlotUnsaved: false });

  const pathInput = within(screen.getByTestId('componentDefinitionFormPath-path')).getByTestId(
    'comboBoxSearchInput'
  );
  fireEvent.change(pathInput, { target: { value: 'team' } });
  fireEvent.keyDown(pathInput, { key: 'Enter' });
  fireEvent.change(screen.getByTestId('componentDefinitionFormLiteral-value'), {
    target: { value: 'core' },
  });
  fireEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorSubmit'));

  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith('POST /internal/streams/components/_validate', {
      params: {
        body: {
          kind: 'processor',
          component: expect.objectContaining({ id: 'set-2', type: 'set' }),
        },
      },
      signal: expect.any(AbortSignal),
    })
  );
});
