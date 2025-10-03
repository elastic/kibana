/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Streams, IngestStreamLifecycle } from '@kbn/streams-schema';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { EditLifecycleModal } from './modal';

// Mock the sub-components
jest.mock('./ilm', () => ({
  IlmField: ({ setLifecycle, setSaveButtonDisabled }: any) => (
    <div data-test-subj="ilm-field">
      <button onClick={() => {
        setLifecycle({ ilm: { policy: 'test-policy' } });
        setSaveButtonDisabled(false);
      }}>
        Select ILM Policy
      </button>
    </div>
  ),
}));

jest.mock('./dsl', () => ({
  DslField: ({ setLifecycle, setSaveButtonDisabled }: any) => (
    <div data-test-subj="dsl-field">
      <button onClick={() => {
        setLifecycle({ dsl: { data_retention: '30d' } });
        setSaveButtonDisabled(false);
      }}>
        Set Custom Period
      </button>
    </div>
  ),
  DEFAULT_RETENTION_UNIT: { value: 'd' },
  DEFAULT_RETENTION_VALUE: 30,
}));

jest.mock('../../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    isServerless: false,
  }),
}));

describe('EditLifecycleModal', () => {
  const mockCloseModal = jest.fn();
  const mockUpdateLifecycle = jest.fn();
  const mockGetIlmPolicies = jest.fn();

  const createMockDefinition = (
    effectiveLifecycle: any,
    ingestLifecycle: any = { inherit: {} },
    streamName: string = 'logs-test',
    isWired: boolean = false
  ): Streams.ingest.all.GetResponse => {
    const definition = {
      stream: {
        name: streamName,
        ingest: {
          lifecycle: ingestLifecycle,
        },
      },
      effective_lifecycle: effectiveLifecycle,
    } as any;

    if (isWired) {
      definition.__type = 'WiredStream';
    }

    return definition;
  };

  const defaultProps = {
    closeModal: mockCloseModal,
    updateLifecycle: mockUpdateLifecycle,
    getIlmPolicies: mockGetIlmPolicies,
    updateInProgress: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIlmPolicies.mockResolvedValue([
      { name: 'policy1' },
      { name: 'policy2' },
    ] as PolicyFromES[]);
  });

  describe('Modal Structure', () => {
    it('should render modal with correct title and buttons', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByText('Edit data retention')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppModalFooterCancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppModalFooterButton')).toBeInTheDocument();
    });

    it('should call closeModal when cancel button is clicked', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const cancelButton = screen.getByTestId('streamsAppModalFooterCancelButton');
      await userEvent.click(cancelButton);

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Inheritance Toggle', () => {
    it('should show inheritance toggle for non-root wired streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { inherit: {} },
        'logs-test.child',
        true
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByText('Inherit retention')).toBeInTheDocument();
      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
      expect(screen.getByText('Use the parent stream\'s retention configuration')).toBeInTheDocument();
    });

    it('should show inheritance toggle for classic streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { inherit: {} },
        'logs-test',
        false
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByText('Inherit from index template')).toBeInTheDocument();
      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
    });

    it('should not show inheritance toggle for root wired streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { inherit: {} },
        'logs', // root stream
        true
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.queryByText('Inherit retention')).not.toBeInTheDocument();
      expect(screen.queryByTestId('inheritDataRetentionSwitch')).not.toBeInTheDocument();
    });

    it('should toggle inheritance switch correctly', async () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { dsl: { data_retention: '30d' } }, // not inheriting
        'logs-test.child',
        true
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      expect(inheritSwitch).not.toBeChecked();

      await userEvent.click(inheritSwitch);
      expect(inheritSwitch).toBeChecked();

      await userEvent.click(inheritSwitch);
      expect(inheritSwitch).not.toBeChecked();
    });
  });

  describe('Retention Options', () => {
    it('should show retention option buttons', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByText('Indefinite')).toBeInTheDocument();
      expect(screen.getByText('Custom period')).toBeInTheDocument();
      expect(screen.getByText('ILM policy')).toBeInTheDocument();
    });

    it('should not show ILM option in serverless mode', () => {
      jest.doMock('../../../../../hooks/use_kibana', () => ({
        useKibana: () => ({
          isServerless: true,
        }),
      }));

      const { EditLifecycleModal: ServerlessModal } = require('./modal');
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<ServerlessModal {...defaultProps} definition={definition} />);

      expect(screen.getByText('Indefinite')).toBeInTheDocument();
      expect(screen.getByText('Custom period')).toBeInTheDocument();
      expect(screen.queryByText('ILM policy')).not.toBeInTheDocument();

      // Reset mock
      jest.dontMock('../../../../../hooks/use_kibana');
    });

    it('should select correct initial action based on effective lifecycle', () => {
      const ilmDefinition = createMockDefinition({ ilm: { policy: 'test-policy' } });
      render(<EditLifecycleModal {...defaultProps} definition={ilmDefinition} />);
      
      // Should have ILM selected (need to check if the ILM field is rendered)
      expect(screen.getByTestId('ilm-field')).toBeInTheDocument();
    });

    it('should handle indefinite retention selection', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const indefiniteButton = screen.getByText('Indefinite');
      await userEvent.click(indefiniteButton);

      // Save button should be enabled
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      expect(saveButton).not.toBeDisabled();
    });

    it('should handle custom period selection', async () => {
      const definition = createMockDefinition({ dsl: {} }); // indefinite initially

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);

      expect(screen.getByTestId('dsl-field')).toBeInTheDocument();
    });

    it('should handle ILM policy selection', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const ilmButton = screen.getByText('ILM policy');
      await userEvent.click(ilmButton);

      expect(screen.getByTestId('ilm-field')).toBeInTheDocument();
      
      // Save button should be disabled initially for ILM
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('should call updateLifecycle with inherit when inheritance is enabled', async () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { dsl: { data_retention: '30d' } },
        'logs-test.child',
        true
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      // Enable inheritance
      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      await userEvent.click(inheritSwitch);

      // Click save
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      await userEvent.click(saveButton);

      expect(mockUpdateLifecycle).toHaveBeenCalledWith({ inherit: {} });
    });

    it('should call updateLifecycle with custom lifecycle when inheritance is disabled', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      // Select custom period and set it
      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);

      const setCustomButton = screen.getByText('Set Custom Period');
      await userEvent.click(setCustomButton);

      // Click save
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      await userEvent.click(saveButton);

      expect(mockUpdateLifecycle).toHaveBeenCalledWith({ dsl: { data_retention: '30d' } });
    });

    it('should disable save button during update', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} updateInProgress={true} />);

      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      const cancelButton = screen.getByTestId('streamsAppModalFooterCancelButton');

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading state on save button during update', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} updateInProgress={true} />);

      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      // EuiButton with isLoading should have loading indicators
      expect(saveButton).toHaveAttribute('disabled');
    });
  });

  describe('Accessibility', () => {
    it('should have proper modal labeling', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should have proper button group legend', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const buttonGroup = screen.getByRole('radiogroup');
      expect(buttonGroup).toHaveAttribute('aria-label', 'Data retention');
    });
  });
});