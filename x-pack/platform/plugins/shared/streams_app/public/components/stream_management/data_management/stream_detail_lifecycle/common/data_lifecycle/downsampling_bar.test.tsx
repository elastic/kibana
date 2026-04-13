/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownsamplingBar } from './downsampling_bar';
import type { DownsamplingSegment } from './data_lifecycle_segments';

describe('DownsamplingBar', () => {
  const defaultProps = {
    gridTemplateColumns: '1fr',
    segments: [
      { grow: 5, step: { after: '0d', fixed_interval: '1h' }, stepIndex: 0 },
    ] as DownsamplingSegment[],
    canManageLifecycle: true,
  };

  describe('Rendering', () => {
    it('should render downsampling label', () => {
      render(<DownsamplingBar {...defaultProps} />);

      expect(screen.getByTestId('downsamplingBar-label')).toBeInTheDocument();
    });

    it('should render downsampling step with interval', () => {
      render(<DownsamplingBar {...defaultProps} />);

      expect(screen.getByTestId('downsamplingPhase-1h-label')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPhase-1h-interval')).toBeInTheDocument();
    });

    it('should render multiple downsampling steps', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 3, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0 },
        { grow: 3, step: { after: '30d', fixed_interval: '1d' }, stepIndex: 1 },
      ];

      render(
        <DownsamplingBar {...defaultProps} segments={segments} gridTemplateColumns="3fr 3fr" />
      );

      expect(screen.getByTestId('downsamplingPhase-1h-label')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPhase-1d-label')).toBeInTheDocument();
    });

    it('should render empty space for segments without steps', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 3 },
        { grow: 3, step: { after: '30d', fixed_interval: '1d' }, stepIndex: 0 },
      ];

      render(
        <DownsamplingBar {...defaultProps} segments={segments} gridTemplateColumns="3fr 3fr" />
      );

      expect(screen.getByTestId('downsamplingPhase-1d-label')).toBeInTheDocument();
    });

    it('should render delete phase segment without downsampling label', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '0d', fixed_interval: '1h' }, stepIndex: 0 },
        { grow: false, isDelete: true },
      ];

      render(
        <DownsamplingBar {...defaultProps} segments={segments} gridTemplateColumns="5fr 50px" />
      );

      expect(screen.getByTestId('downsamplingPhase-1h-label')).toBeInTheDocument();
      expect(screen.queryByTestId('downsamplingPhase-delete-label')).not.toBeInTheDocument();
    });
  });

  describe('Popover interaction', () => {
    it('should open popover on click', () => {
      render(<DownsamplingBar {...defaultProps} />);

      const button = screen.getByTestId('downsamplingPhase-1h-label');
      fireEvent.click(button);

      expect(screen.getByTestId('downsamplingPopover-step1-title')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPopover-step1-afterDataStored')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPopover-step1-interval')).toBeInTheDocument();
    });

    it('should display phase name in popover for ILM', () => {
      const segments: DownsamplingSegment[] = [
        {
          grow: 5,
          step: { after: '10d', fixed_interval: '1h' },
          stepIndex: 0,
          phaseName: 'hot',
        },
      ];

      render(<DownsamplingBar {...defaultProps} segments={segments} />);

      const button = screen.getByTestId('downsamplingPhase-1h-label');
      fireEvent.click(button);

      expect(screen.getByTestId('downsamplingPopover-step1-definedIn')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPopover-step1-phaseName')).toBeInTheDocument();
    });

    it('should display correct step number', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 3, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0 },
        { grow: 3, step: { after: '30d', fixed_interval: '1d' }, stepIndex: 1 },
      ];

      render(
        <DownsamplingBar {...defaultProps} segments={segments} gridTemplateColumns="3fr 3fr" />
      );

      // Click on second step
      const secondButton = screen.getByTestId('downsamplingPhase-1d-label');
      fireEvent.click(secondButton);

      expect(screen.getByTestId('downsamplingPopover-step2-title')).toBeInTheDocument();
    });

    it('should render remove button for ILM and call onRemoveStep', () => {
      const onRemoveStep = jest.fn();
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0, phaseName: 'hot' },
      ];

      render(<DownsamplingBar {...defaultProps} segments={segments} onRemoveStep={onRemoveStep} />);

      fireEvent.click(screen.getByTestId('downsamplingPhase-1h-label'));
      fireEvent.click(screen.getByTestId('downsamplingPopover-step1-removeButton'));

      expect(onRemoveStep).toHaveBeenCalledWith(1);
    });

    it('should not render remove button when user lacks permission', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0, phaseName: 'hot' },
      ];

      render(
        <DownsamplingBar
          {...defaultProps}
          segments={segments}
          onRemoveStep={jest.fn()}
          canManageLifecycle={false}
        />
      );

      fireEvent.click(screen.getByTestId('downsamplingPhase-1h-label'));

      expect(
        screen.queryByTestId('downsamplingPopover-step1-removeButton')
      ).not.toBeInTheDocument();
    });

    it('should not render remove button when user cannot manage lifecycle', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0, phaseName: 'hot' },
      ];

      render(<DownsamplingBar {...defaultProps} segments={segments} />);

      fireEvent.click(screen.getByTestId('downsamplingPhase-1h-label'));

      expect(
        screen.queryByTestId('downsamplingPopover-step1-removeButton')
      ).not.toBeInTheDocument();
    });

    it('should not render remove button if onRemoveStep is undefined', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0, phaseName: 'hot' },
      ];

      render(<DownsamplingBar {...defaultProps} segments={segments} onRemoveStep={undefined} />);

      fireEvent.click(screen.getByTestId('downsamplingPhase-1h-label'));
    });
  });
});
