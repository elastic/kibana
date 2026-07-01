/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownsamplingBar, getDownsamplingLayout } from './downsampling_bar';
import type { DownsamplingSegment } from './data_lifecycle_segments';

describe('getDownsamplingLayout', () => {
  it('spans the last step to the end (before delete)', () => {
    const segments: DownsamplingSegment[] = [
      { grow: 1, step: { after: '0d', fixed_interval: '1h' }, stepIndex: 0 },
      { grow: 1 },
      { grow: 1 },
      { grow: false, isDelete: true },
    ];

    const layout = getDownsamplingLayout(segments);
    const step = layout.find((entry) => entry.segment.step?.after === '0d');
    // Spans columns 1..3 (the two trailing non-step columns are covered), delete stays span 1.
    expect(step?.span).toBe(3);
    expect(layout.filter((entry) => entry.hidden)).toHaveLength(2);
  });

  it('spans a middle step across an extra non-step column (frozen boundary between steps)', () => {
    // Reproduces frozen_after=10d with steps at 1d,2d,4d,8d,16d: a non-step column (the 10d frozen
    // boundary) sits between the 8d step and the 16d step. The 8d step must span across it to the
    // 16d mark instead of being cut off at 10d.
    const segments: DownsamplingSegment[] = [
      { grow: 1 }, // 0d start, no step
      { grow: 1, step: { after: '1d', fixed_interval: '1h' }, stepIndex: 0 },
      { grow: 1, step: { after: '2d', fixed_interval: '1h' }, stepIndex: 1 },
      { grow: 1, step: { after: '4d', fixed_interval: '1h' }, stepIndex: 2 },
      { grow: 1, step: { after: '8d', fixed_interval: '1h' }, stepIndex: 3 },
      { grow: 1 }, // 10d frozen boundary, no step
      { grow: 1, step: { after: '16d', fixed_interval: '1h' }, stepIndex: 4 },
      { grow: false, isDelete: true },
    ];

    const layout = getDownsamplingLayout(segments);

    // The 8d step (column 5) must span 2 columns to reach the 16d step column (covering the 10d
    // frozen boundary at column 6).
    const step8d = layout.find((entry) => entry.segment.step?.after === '8d');
    expect(step8d?.columnStart).toBe(5);
    expect(step8d?.span).toBe(2);

    // The frozen boundary column is hidden (covered by the 8d step's span), so no empty panel
    // truncates the 8d bar at 10d.
    const frozenColumn = layout[5];
    expect(frozenColumn.segment.step).toBeUndefined();
    expect(frozenColumn.hidden).toBe(true);

    // The 16d step is the last step and spans to the end before delete.
    const step16d = layout.find((entry) => entry.segment.step?.after === '16d');
    expect(step16d?.columnStart).toBe(7);
    expect(step16d?.span).toBe(1);
  });

  it('keeps a non-step column before the first step visible', () => {
    const segments: DownsamplingSegment[] = [
      { grow: 1 }, // 0d start, no step, before first step
      { grow: 1, step: { after: '5d', fixed_interval: '1h' }, stepIndex: 0 },
    ];

    const layout = getDownsamplingLayout(segments);
    expect(layout[0].hidden).toBe(false);
    expect(layout[0].span).toBe(1);
  });
});

describe('DownsamplingBar', () => {
  const defaultProps = {
    gridTemplateColumns: '1fr',
    segments: [
      { grow: 5, step: { after: '0d', fixed_interval: '1h' }, stepIndex: 0 },
    ] as DownsamplingSegment[],
    canManageLifecycle: true,
  };

  describe('Empty state', () => {
    it('should render empty state when no downsampling steps exist', () => {
      render(
        <DownsamplingBar
          {...defaultProps}
          segments={[{ grow: 5 }] as DownsamplingSegment[]}
          gridTemplateColumns="1fr"
        />
      );

      expect(screen.getByTestId('downsamplingBar-empty')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingBar-emptyLabel')).toHaveTextContent('No downsampling');
      expect(screen.queryByTestId('downsamplingPhase-1h-label')).not.toBeInTheDocument();

      expect(screen.getByTestId('downsamplingBar-container')).toHaveStyle('border: none');
      expect(screen.getByTestId('downsamplingBar-empty')).toHaveStyle('text-align: center');
      expect(screen.getByTestId('downsamplingBar-empty')).toHaveStyle('border-radius: 8px');
    });
  });

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
      expect(screen.getByTestId('downsamplingBar-container')).toHaveStyle('border: none');
    });
  });

  describe('Popover interaction', () => {
    it('should open popover on click', () => {
      render(<DownsamplingBar {...defaultProps} />);

      const button = screen.getByTestId('downsamplingPhase-1h-label');
      fireEvent.click(button);

      expect(screen.getByTestId('downsamplingPopover-step1-title')).toBeInTheDocument();
      expect(screen.getByTestId('downsamplingPopover-step1-ageBadge')).toHaveTextContent('0d');
      expect(screen.getByTestId('downsamplingPopover-step1-interval')).toBeInTheDocument();
      expect(screen.getByLabelText('Downsample step 1')).toBeInTheDocument();
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
