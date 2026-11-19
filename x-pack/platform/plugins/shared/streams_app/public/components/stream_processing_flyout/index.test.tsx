/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { createActor, setup } from 'xstate';
import type { ComponentCatalogue } from '@kbn/streams-schema';
import fixture from '../../services/component_catalogue/catalogue_snapshot/components_v1.json';
import type { ComponentCatalogueState } from '../../services/component_catalogue';
import type { ProcessingNodeRef } from '../../services/unit_graph';
import type { UnitProcessor } from '../../services/unit_processing';
import type { Unit } from '../../services/unit_repository';
import {
  processingFlyoutMachine,
  type ProcessingFlyoutInput,
} from './state_management/processing_flyout_machine';
import { ProcessingFlyout } from '.';

const mockOpenConfirm = jest.fn();
const mockCloseProcessingFlyout = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: { overlays: { openConfirm: mockOpenConfirm } },
    dependencies: { start: { streams: { streamsRepositoryClient: mockRepositoryClient } } },
  }),
}));

jest.mock('../stream_management/data_management/stream_detail_canvas/state_management', () => ({
  useCanvasEvents: () => ({ closeProcessingFlyout: mockCloseProcessingFlyout }),
  useCanvasUnitDefinition: () => mockUnit,
}));

jest.mock('../../services/component_catalogue', () => ({
  ...jest.requireActual('../../services/component_catalogue'),
  useComponentCatalogue: () => mockCatalogueState,
}));

const catalogue = fixture as ComponentCatalogue;

const mockRepositoryClient = { fetch: jest.fn() };

const mockCatalogueState: ComponentCatalogueState = {
  catalogue,
  editableCatalogue: catalogue,
  stale: false,
  loading: false,
  refresh: () => {},
};

const savedProcessor: UnitProcessor = {
  id: 'add-fields-1',
  type: 'add_fields',
  supported_telemetry: ['logs'],
  config: [
    { name: 'fields', value: [{ action: 'delete', location: 'attributes', path: 'secret' }] },
  ],
};

const mockUnit: Unit = {
  unit: { sources: [], destinations: [], processors: [savedProcessor], pipelines: [] },
  ui_metadata: {},
};

const slot: ProcessingNodeRef = { kind: 'pipeline', pipelineId: 'processing-1' };

const renderFlyout = (input: Partial<Omit<ProcessingFlyoutInput, 'parentRef'>> = {}) => {
  const parentRef = createActor(setup({}).createMachine({})).start();
  const ref = createActor(processingFlyoutMachine, {
    input: {
      slot,
      telemetry: ['logs'],
      processors: [savedProcessor],
      editable: true,
      parentRef,
      ...input,
    },
  }).start();
  render(
    <EuiProvider>
      <ProcessingFlyout flyout={{ slot, ref }} />
    </EuiProvider>
  );
};

/** Sets the path combo box in two synchronous events; typing it re-renders per keystroke. */
const commitPath = (value: string) => {
  const input = screen.getByTestId('componentDefinitionFormPath-path').querySelector('input');
  if (!input) {
    throw new Error('Path combo box rendered without a search input');
  }
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const editFirstProcessor = async () => {
  await userEvent.click(screen.getByTestId('streamsProcessingFlyoutStepTitle'));
  expect(screen.getByTestId('streamsProcessingFlyoutEditor')).toBeTruthy();
};

const closeFlyout = () => userEvent.click(screen.getByTestId('streamsProcessingFlyoutClose'));

const expectClosedWithoutAsking = () => {
  expect(mockOpenConfirm).not.toHaveBeenCalled();
  expect(mockCloseProcessingFlyout).toHaveBeenCalledTimes(1);
};

const expectAskedBeforeClosing = async () => {
  await waitFor(() => expect(mockOpenConfirm).toHaveBeenCalledTimes(1));
  expect(mockCloseProcessingFlyout).not.toHaveBeenCalled();
};

beforeEach(() => {
  mockOpenConfirm.mockReset();
  mockCloseProcessingFlyout.mockReset();
});

// Every case mounts the whole flyout and its editor, a cost that parallel CI load pushes past 5s.
jest.setTimeout(30_000);

describe('ProcessingFlyout', () => {
  describe('closing', () => {
    it('closes without asking when a processor was opened for editing but not changed', async () => {
      renderFlyout();
      await editFirstProcessor();

      await closeFlyout();

      expectClosedWithoutAsking();
    });

    it('asks before discarding changes to the processor open in the editor', async () => {
      mockOpenConfirm.mockResolvedValue(false);
      renderFlyout();
      await editFirstProcessor();
      commitPath('secret.token');

      await closeFlyout();

      await expectAskedBeforeClosing();
    });

    it('asks before discarding processors changed since the last save', async () => {
      mockOpenConfirm.mockResolvedValue(false);
      renderFlyout();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutStepActions'));
      await userEvent.click(await screen.findByTestId('streamsProcessingFlyoutStepDuplicate'));

      await closeFlyout();

      await expectAskedBeforeClosing();
    });

    it('closes without asking when a new processor was started but not filled in', async () => {
      renderFlyout();
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutAddProcessor'));
      expect(screen.getByTestId('streamsProcessingFlyoutEditor')).toBeTruthy();

      await closeFlyout();

      expectClosedWithoutAsking();
    });

    it('closes without asking when it opened straight into a new processor left untouched', async () => {
      renderFlyout({ initialCreate: { position: 'start' } });
      expect(screen.getByTestId('streamsProcessingFlyoutEditor')).toBeTruthy();

      await closeFlyout();

      expectClosedWithoutAsking();
    });

    it('closes without asking once the changes were discarded in the editor', async () => {
      mockOpenConfirm.mockResolvedValue(true);
      renderFlyout();
      await editFirstProcessor();
      commitPath('secret.token');
      await userEvent.click(screen.getByTestId('streamsProcessingFlyoutEditorCancel'));
      await waitFor(() => expect(screen.queryByTestId('streamsProcessingFlyoutEditor')).toBeNull());
      mockOpenConfirm.mockClear();

      await closeFlyout();

      expectClosedWithoutAsking();
    });
  });
});
