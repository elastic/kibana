/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataLifecycleSummary } from './data_lifecycle_summary';
import { type LifecyclePhase } from './lifecycle_types';

describe('DataLifecycleSummary', () => {
  const defaultProps = {
    model: {
      phases: [],
    },
    capabilities: { canManageLifecycle: true },
    showDownsampling: true,
  };
  describe('Loading State', () => {
    it('should show skeleton when data is being fetched', () => {
      render(<DataLifecycleSummary {...defaultProps} model={{ loading: true, phases: [] }} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('dataLifecycleSummary-skeleton')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render title with no phases when phases array is empty', () => {
      render(<DataLifecycleSummary {...defaultProps} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.queryByTestId('dataLifecycleSummary-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Phase Rendering', () => {
    it('should render phases with labels and sizes', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          timelineValue: '30d',
          min_age: '0d',
        },
        {
          color: '#FFA500',
          name: 'warm',
          label: 'warm',
          size: '500.0 KB',
          grow: 3,
          timelineValue: '60d',
          min_age: '30d',
        },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          isDelete: true,
          min_age: '60d',
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByText('0d')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-warm-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-size')).toHaveTextContent('1.0 MB');
      expect(screen.getByTestId('lifecyclePhase-warm-size')).toHaveTextContent('500.0 KB');
      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should render start timeline with the same unit as the first timeline value', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          timelineValue: '1s',
          min_age: '0s',
        },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          isDelete: true,
          min_age: '1s',
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('should render single phase with delete icon', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#00FF00',
          name: 'main',
          label: 'Main phase',
          size: '2.0 GB',
          grow: true,
          timelineValue: '30d',
          min_age: '0d',
        },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          isDelete: true,
          min_age: '30d',
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByTestId('lifecyclePhase-Main phase-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-Main phase-size')).toHaveTextContent('2.0 GB');
      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Infinite Retention', () => {
    it('should not render delete icon when retention is infinite', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#00FF00',
          name: 'main',
          label: 'Main phase',
          size: '2.0 GB',
          grow: true,
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByTestId('lifecyclePhase-Main phase-name')).toBeInTheDocument();
      expect(screen.queryByTestId('dataLifecycle-delete-icon')).not.toBeInTheDocument();
    });

    it('should render infinite symbol when no timelineValue is provided', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'main',
          label: 'Main phase',
          size: '50.0 KB',
          grow: true,
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
    });
  });

  describe('ILM Downsampling', () => {
    it('should render downsampling bar when phase has downsample', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          timelineValue: '30d',
          downsample: {
            after: '0d',
            fixed_interval: '1h',
          },
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByTestId('downsamplingPhase-1h-label')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPhase-1h-interval')).toHaveTextContent('1h');
    });

    it('should render downsampling bar with empty space for delete phase', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          timelineValue: '30d',
          downsample: {
            after: '0d',
            fixed_interval: '1h',
          },
        },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          isDelete: true,
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.getByTestId('downsamplingPhase-1h-label')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPhase-1h-interval')).toHaveTextContent('1h');
      expect(screen.queryByTestId('downsamplingPhase-delete-label')).not.toBeInTheDocument();
    });

    it('should not render downsampling bar when show downsampling is false', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: true,
        },
      ];

      const downsampleSteps = [
        { fixed_interval: '1d', after: '20d' },
        { fixed_interval: '5d', after: '40d' },
      ];

      render(
        <DataLifecycleSummary
          {...defaultProps}
          model={{ phases, downsampleSteps }}
          showDownsampling={false}
        />
      );

      expect(screen.queryByTestId('downsamplingBar-label')).not.toBeInTheDocument();
      expect(screen.queryByTestId('downsamplingPhase-1d-label')).not.toBeInTheDocument();
      expect(screen.queryByText('20d')).not.toBeInTheDocument();
      expect(screen.queryByText('40d')).not.toBeInTheDocument();
    });
  });

  describe('DSL Downsampling', () => {
    it('should render multiple downsampling steps in a single bar for DSL', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: true,
        },
      ];

      const downsampleSteps = [
        { fixed_interval: '1d', after: '20d' },
        { fixed_interval: '5d', after: '40d' },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases, downsampleSteps }} />);

      expect(screen.getByTestId('downsamplingPhase-1d-label')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPhase-1d-interval')).toHaveTextContent('1d');
      expect(screen.getByTestId('downsamplingPhase-5d-label')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPhase-5d-interval')).toHaveTextContent('5d');
      expect(screen.getByText('20d')).toBeInTheDocument();
      expect(screen.getByText('40d')).toBeInTheDocument();
    });

    it('should not render downsampling bar when no downsample steps', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          timelineValue: '30d',
        },
      ];

      render(<DataLifecycleSummary {...defaultProps} model={{ phases }} />);

      expect(screen.queryByTestId('downsamplingPhase-1d-label')).not.toBeInTheDocument();
    });
  });

  describe('ILM actions', () => {
    it('should show remove actions for ILM phases and downsampling steps', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          downsample: { after: '0d', fixed_interval: '1h' },
        },
        {
          color: '#FFA500',
          name: 'warm',
          label: 'warm',
          size: '500.0 KB',
          grow: 3,
          min_age: '30d',
        },
      ];

      render(
        <DataLifecycleSummary
          {...defaultProps}
          model={{ phases }}
          phaseActions={{ onRemovePhase: jest.fn() }}
          downsamplingActions={{ onRemoveDownsampleStep: jest.fn() }}
        />
      );

      fireEvent.click(screen.getByTestId('downsamplingPhase-1h-label'));
      expect(screen.getByTestId('downsamplingPopover-step1-removeButton')).toBeInTheDocument();

      const warmPhaseButton = screen
        .getByTestId('lifecyclePhase-warm-name')
        .closest('[role="button"]');
      fireEvent.click(warmPhaseButton!);
      expect(screen.getByTestId('lifecyclePhase-warm-removeButton')).toBeInTheDocument();
    });
  });

  describe('Edit flyout open behavior', () => {
    it('should navigate to phase when edit flyout is open (no popover)', () => {
      const onEditPhase = jest.fn();
      const phases: LifecyclePhase[] = [
        { grow: 5, name: 'hot', label: 'hot', color: '#FF0000', min_age: '0d' },
        { grow: 3, name: 'warm', label: 'warm', color: '#FFA500', min_age: '30d' },
      ];

      render(
        <DataLifecycleSummary
          {...defaultProps}
          model={{ phases }}
          phaseActions={{ onEditPhase }}
          uiState={{ isEditLifecycleFlyoutOpen: true }}
        />
      );

      fireEvent.click(screen.getByTestId('lifecyclePhase-warm-button'));

      expect(onEditPhase).toHaveBeenCalledWith(phases[1].label);
      expect(screen.queryByTestId('lifecyclePhase-warm-popoverTitle')).not.toBeInTheDocument();
    });

    it('should navigate to downsampling step when edit flyout is open (no popover)', () => {
      const onEditDownsampleStep = jest.fn();
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          name: 'hot',
          label: 'hot',
          grow: 5,
          downsample: { after: '0d', fixed_interval: '1h' },
        },
      ];

      render(
        <DataLifecycleSummary
          {...defaultProps}
          model={{ phases }}
          downsamplingActions={{ onEditDownsampleStep }}
          uiState={{ isEditLifecycleFlyoutOpen: true }}
        />
      );

      fireEvent.click(screen.getByTestId('downsamplingPhase-1h-label'));

      expect(onEditDownsampleStep).toHaveBeenCalledWith(1, 'hot');
      expect(screen.queryByTestId('downsamplingPopover-step1-title')).not.toBeInTheDocument();
    });
  });
});
