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
import type { IlmPolicy } from '@kbn/streams-schema';
import { EditLifecycleModal } from './modal';

jest.mock('../../../../../hooks/use_kibana');

import { useKibana } from '../../../../../hooks/use_kibana';

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('EditLifecycleModal', () => {
  const mockCloseModal = jest.fn();
  const mockUpdateLifecycle = jest.fn();
  const mockGetIlmPolicies = jest.fn();

  const createMockDefinition = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    effectiveLifecycle: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ingestLifecycle: any = { inherit: {} },
    streamName: string = 'logs-test',
    isWired: boolean = false
  ): Streams.ingest.all.GetResponse => {
    const definition = {
      stream: {
        name: streamName,
        description: '',
        updated_at: new Date().toISOString(),
        ingest: {
          lifecycle: ingestLifecycle,
          processing: { steps: [], updated_at: new Date().toISOString() },
          settings: {},
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      },
      effective_lifecycle: effectiveLifecycle,
      effective_settings: {},
      inherited_fields: {},
      dashboards: [],
      rules: [],
      queries: [],
      privileges: {
        manage: true,
        monitor: true,
        lifecycle: true,
        simulate: true,
        text_structure: true,
        read_failure_store: true,
        manage_failure_store: true,
        view_index_metadata: true,
      },
      effective_failure_store: {
        lifecycle: { enabled: { is_default_retention: true } },
        from: streamName,
      },
    };

    if (isWired) {
      // Wired effective lifecycle must include a `from` field to satisfy schema
      if ((effectiveLifecycle.dsl || effectiveLifecycle.ilm) && !effectiveLifecycle.from) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (definition as any).effective_lifecycle = {
          ...effectiveLifecycle,
          from: streamName,
        };
      }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockGetIlmPolicies.mockResolvedValue([{ name: 'policy1' }, { name: 'policy2' }] as IlmPolicy[]);
  });

  describe('Modal Structure', () => {
    it('should render modal with correct title and buttons', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByTestId('editLifecycleModalTitle')).toHaveTextContent(
        'Edit data retention'
      );
      expect(screen.getByTestId('streamsAppModalFooterCancelButton')).toBeInTheDocument();
      expect(screen.getByTestId('streamsAppModalFooterButton')).toBeInTheDocument();

      // Verify that the retention options are rendered
      expect(screen.getByTestId('dataRetentionButtonGroup')).toBeInTheDocument();
      expect(screen.getByTestId('indefiniteRetentionButton')).toBeInTheDocument();
      expect(screen.getByTestId('customRetentionButton')).toBeInTheDocument();
      expect(screen.getByTestId('ilmRetentionButton')).toBeInTheDocument();
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
      expect(screen.getByTestId('inheritRetentionHeading')).toBeInTheDocument();
      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
      // Should display the switch description for wired streams
      expect(
        screen.getByText('Use the parent stream’s retention configuration')
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

      expect(screen.getByTestId('inheritRetentionHeading')).toBeInTheDocument();
      expect(screen.getByTestId('inheritDataRetentionSwitch')).toBeInTheDocument();
      // Should display the switch description for classic streams
      expect(
        screen.getByText('Use the stream’s index template retention configuration')
      ).toBeInTheDocument();
    });

    it('should not show inheritance label for root wired streams', () => {
      const definition = createMockDefinition(
        { dsl: { data_retention: '30d' } },
        { inherit: {} },
        'logs', // root stream
        true
      );

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.queryByTestId('inheritRetentionHeading')).not.toBeInTheDocument();
    });
  });

  describe('Retention Options', () => {
    it('should show retention option buttons', () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      expect(screen.getByTestId('dataRetentionButtonGroup')).toBeInTheDocument();
    });

    it('should handle indefinite retention selection', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });

      render(<EditLifecycleModal {...defaultProps} definition={definition} />);

      const indefiniteButton = screen.getByTestId('indefiniteRetentionButton');
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
      const customButton = screen.getByTestId('customRetentionButton');
      await userEvent.click(customButton);
      // DSL field renders with input for custom period
      expect(screen.getByTestId('streamsAppDslModalDaysField')).toBeInTheDocument();
    });

    it('should handle ILM policy selection', async () => {
      const definition = createMockDefinition({ dsl: { data_retention: '30d' } });
      render(<EditLifecycleModal {...defaultProps} definition={definition} />);
      const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
      await userEvent.click(inheritSwitch);
      const ilmButton = screen.getByTestId('ilmRetentionButton');
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
      const indefiniteButton = screen.getByTestId('indefiniteRetentionButton');
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

    describe('Lifecyle disabled', () => {
      it('should default to indefinite retention when lifecycle is disabled', async () => {
        const definition = createMockDefinition({ disabled: {} }, { inherit: {} });

        render(<EditLifecycleModal {...defaultProps} definition={definition} />);

        expect(screen.getByTestId('indefiniteRetentionButton')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        expect(screen.getByTestId('streamsAppModalFooterButton')).toBeDisabled();
      });
      it('should call updateLifecycle with dsl when disabling inheritance from disabled lifecycle', async () => {
        const definition = createMockDefinition({ disabled: {} }, { inherit: {} });

        render(<EditLifecycleModal {...defaultProps} definition={definition} />);

        // Initially save button is disabled
        const saveButton = screen.getByTestId('streamsAppModalFooterButton');
        expect(saveButton).toBeDisabled();

        // Disable inheritance
        const inheritSwitch = screen.getByTestId('inheritDataRetentionSwitch');
        await userEvent.click(inheritSwitch);

        // Save button should now be enabled
        expect(saveButton).not.toBeDisabled();

        // Click save
        await userEvent.click(saveButton);

        // Should save as DSL without data_retention (indefinite)
        expect(mockUpdateLifecycle).toHaveBeenCalledWith({ dsl: {} });
      });
    });
  });
});
