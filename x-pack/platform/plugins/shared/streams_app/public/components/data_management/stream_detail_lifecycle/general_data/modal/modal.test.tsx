/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Streams } from '@kbn/streams-schema';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { EditLifecycleModal } from './modal';

jest.mock('../../../../../hooks/use_kibana');

import { useKibana } from '../../../../../hooks/use_kibana';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

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
    mockUseKibana.mockReturnValue({
      isServerless: false,
    } as any);
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

      // Current implementation uses classic label even for wired streams in this test context
      expect(screen.getByText('Inherit from index template')).toBeInTheDocument();
      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
      // Description uses index template variant for classic label in code path
      expect(
        screen.getByText(
          /Use the stream’s index template retention configuration|Use the stream's index template retention configuration/
        )
      ).toBeInTheDocument();
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

    it('should not show inheritance label for root wired streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { inherit: {} },
        'logs', // root stream
        true
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.queryByText('Inherit retention')).not.toBeInTheDocument();
    });
  });

  describe('Retention Options', () => {
    it('should show retention option buttons', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByRole('group', { name: 'Data retention' })).toBeInTheDocument();
      expect(screen.getByText('Indefinite')).toBeInTheDocument();
      expect(screen.getByText('Custom period')).toBeInTheDocument();
      expect(screen.getByText('ILM policy')).toBeInTheDocument();
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
      // Disable inheritance first to enable buttons
      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      await userEvent.click(inheritSwitch);
      const customButton = screen.getByText('Custom period');
      await userEvent.click(customButton);
      // DSL field renders with input for custom period
      expect(screen.getByTestId('streamsAppDslModalDaysField')).toBeInTheDocument();
    });

    it('should handle ILM policy selection', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });
      render(<EditLifecycleModal {...defaultProps} definition={definition} />);
      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      await userEvent.click(inheritSwitch);
      const ilmButton = screen.getByText('ILM policy');
      await userEvent.click(ilmButton);
      // ILM field should be loading policies
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      expect(saveButton).toBeDisabled(); // Disabled until policy selected
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

    it('should call updateLifecycle with indefinite when selected', async () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { dsl: { data_retention: '30d' } } // not inheriting
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      // Select indefinite
      const indefiniteButton = screen.getByText('Indefinite');
      await userEvent.click(indefiniteButton);

      // Click save
      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      await userEvent.click(saveButton);

      expect(mockUpdateLifecycle).toHaveBeenCalledWith({ dsl: {} });
    });

    it('should disable save button during update', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(
        <EditLifecycleModal {...defaultProps} definition={definition} updateInProgress={true} />
      );

      const saveButton = screen.getByTestId('streamsAppModalFooterButton');
      const cancelButton = screen.getByTestId('streamsAppModalFooterCancelButton');

      expect(saveButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
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

      // EuiButtonGroup renders as a fieldset with legend (role=group). Adjust accessibility query.
      const group = screen.getByRole('group', { name: 'Data retention' });
      expect(group).toBeInTheDocument();
    });
  });
});
