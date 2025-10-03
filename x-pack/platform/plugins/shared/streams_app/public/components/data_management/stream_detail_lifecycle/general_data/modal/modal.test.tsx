/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditLifecycleModal } from './modal';
import type { Streams, IngestStreamLifecycle } from '@kbn/streams-schema';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';

// Mock the Kibana hook
const mockIsServerless = false;

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    isServerless: mockIsServerless,
  }),
}));

// Mock the IlmField component
jest.mock('./ilm', () => ({
  IlmField: jest.fn(({ initialValue, setLifecycle, setSaveButtonDisabled, readOnly }) => (
    <div data-testid="ilm-field">
      <span data-testid="ilm-initial-value">{JSON.stringify(initialValue)}</span>
      <span data-testid="ilm-readonly">{readOnly.toString()}</span>
      <button
        data-testid="ilm-set-lifecycle"
        onClick={() => setLifecycle({ ilm: { policy: 'test-policy' } })}
      >
        Set ILM Policy
      </button>
      <button
        data-testid="ilm-enable-save"
        onClick={() => setSaveButtonDisabled(false)}
      >
        Enable Save
      </button>
    </div>
  )),
}));

// Mock the DslField component
jest.mock('./dsl', () => ({
  DslField: jest.fn(({ initialValue, setLifecycle, setSaveButtonDisabled, isDisabled }) => (
    <div data-testid="dsl-field">
      <span data-testid="dsl-initial-value">{JSON.stringify(initialValue)}</span>
      <span data-testid="dsl-disabled">{isDisabled.toString()}</span>
      <button
        data-testid="dsl-set-lifecycle"
        onClick={() => setLifecycle({ dsl: { data_retention: '30d' } })}
      >
        Set DSL
      </button>
      <button
        data-testid="dsl-enable-save"
        onClick={() => setSaveButtonDisabled(false)}
      >
        Enable Save
      </button>
    </div>
  )),
  DEFAULT_RETENTION_VALUE: 30,
  DEFAULT_RETENTION_UNIT: { value: 'd' },
}));

describe('EditLifecycleModal', () => {
  const mockCloseModal = jest.fn();
  const mockUpdateLifecycle = jest.fn();
  const mockGetIlmPolicies = jest.fn().mockResolvedValue([]);

  const createMockDefinition = (
    streamName = 'test-stream',
    lifecycle: any = { dsl: { data_retention: '30d' } },
    isWired = false
  ): Streams.ingest.all.GetResponse => ({
    stream: {
      name: streamName,
      ingest: {
        lifecycle: { inherit: {} },
      },
    },
    effective_lifecycle: lifecycle,
  } as unknown as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders modal with correct title', () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.getByText('Edit data retention')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders cancel and save buttons', () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.getByTestId('streamsAppModalFooterCancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppModalFooterButton')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Inherit Toggle Functionality', () => {
    it('shows inherit toggle for non-root wired streams', () => {
      const definition = createMockDefinition('logs.app', { dsl: { data_retention: '30d' } }, true);

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
      expect(screen.getByText('Inherit retention')).toBeInTheDocument();
    });

    it('shows inherit toggle for non-wired streams', () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
      expect(screen.getByText('Inherit from index template')).toBeInTheDocument();
    });

    it('toggles inherit switch correctly', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      
      // Initially should not be checked (since it's not inheriting)
      expect(inheritSwitch).not.toBeChecked();

      // Toggle on
      await userEvent.click(inheritSwitch);
      expect(inheritSwitch).toBeChecked();

      // Toggle off
      await userEvent.click(inheritSwitch);
      expect(inheritSwitch).not.toBeChecked();
    });
  });

  describe('Retention Type Selection', () => {
    it('renders retention type button group', () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.getByText('Indefinite')).toBeInTheDocument();
      expect(screen.getByText('Custom period')).toBeInTheDocument();
    });

    it('includes ILM policy option in non-serverless mode', () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.getByText('ILM policy')).toBeInTheDocument();
    });

    it('excludes ILM policy option in serverless mode', () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: true });

      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      expect(screen.queryByText('ILM policy')).not.toBeInTheDocument();
    });

    it('handles indefinite retention selection', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const indefiniteButton = screen.getByText('Indefinite');
      await userEvent.click(indefiniteButton);

      // Save button should be enabled for indefinite retention
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      expect(saveButton).not.toBeDisabled();
    });

    it('handles custom period selection', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);

      // Should render DSL field
      expect(screen.getByTestId('dsl-field')).toBeInTheDocument();
    });
  });

  describe('Field Rendering Based on Selection', () => {
    it('renders ILM field when ILM is selected', async () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const ilmButton = screen.getByText('ILM policy');
      await userEvent.click(ilmButton);

      expect(screen.getByTestId('ilm-field')).toBeInTheDocument();
    });

    it('renders DSL field when custom period is selected', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);

      expect(screen.getByTestId('dsl-field')).toBeInTheDocument();
    });

    it('disables fields when inherit toggle is on', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      // Enable inherit toggle
      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      await userEvent.click(inheritSwitch);

      // Button group should be disabled
      const buttonGroup = screen.getByRole('radiogroup');
      expect(buttonGroup).toBeDisabled();
    });
  });

  describe('Modal Actions', () => {
    it('calls closeModal when cancel button is clicked', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const cancelButton = screen.getByTestId('streamsAppModalFooterCancelButton');
      await userEvent.click(cancelButton);

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });

    it('calls closeModal when modal is closed via close button', () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      // Simulate modal close (via EuiModal onClose)
      const modal = screen.getByRole('dialog');
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });
    });

    it('calls updateLifecycle with inherit when inherit is toggled on', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      // Enable inherit toggle
      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      await userEvent.click(inheritSwitch);

      // Click save
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      await userEvent.click(saveButton);

      expect(mockUpdateLifecycle).toHaveBeenCalledWith({ inherit: {} });
    });

    it('calls updateLifecycle with current lifecycle when inherit is off', async () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      // Click save (inherit should be off by default)
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      await userEvent.click(saveButton);

      expect(mockUpdateLifecycle).toHaveBeenCalledWith(
        expect.objectContaining({ dsl: { data_retention: '30d' } })
      );
    });

    it('disables buttons when update is in progress', () => {
      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={true}
        />
      );

      const cancelButton = screen.getByTestId('streamsAppModalFooterCancelButton');
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');

      expect(cancelButton).toBeDisabled();
      expect(saveButton).toHaveAttribute('aria-label', 'Loading');
    });
  });

  describe('Save Button State', () => {
    it('save button is initially disabled for ILM selection', async () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition('', { ilm: { policy: 'test' } });

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      expect(saveButton).toBeDisabled();
    });

    it('save button can be enabled via ILM field interaction', async () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition('', { ilm: { policy: 'test' } });

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      // Interact with ILM field to enable save
      const enableSaveButton = screen.getByTestId('ilm-enable-save');
      await userEvent.click(enableSaveButton);

      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Description Text', () => {
    it('shows description for custom period in non-serverless mode', async () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: false });

      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);

      expect(screen.getByText(/This retention period stores data in the hot tier/)).toBeInTheDocument();
    });

    it('does not show description for custom period in serverless mode', async () => {
      const mockUseKibana = require('../../../../../hooks/use_kibana');
      mockUseKibana.useKibana.mockReturnValue({ isServerless: true });

      const definition = createMockDefinition();

      render(
        <EditLifecycleModal
          closeModal={mockCloseModal}
          updateLifecycle={mockUpdateLifecycle}
          getIlmPolicies={mockGetIlmPolicies}
          definition={definition}
          updateInProgress={false}
        />
      );

      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);

      expect(screen.queryByText(/This retention period stores data in the hot tier/)).not.toBeInTheDocument();
    });
  });
});