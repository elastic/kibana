/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DownsamplingPhase } from './downsampling_phase';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';

describe('DownsamplingPhase', () => {
  const downsample: DownsampleStep = {
    after: '10d',
    fixed_interval: '1h',
  };

  it('should open popover on click', () => {
    render(<DownsamplingPhase downsample={downsample} stepNumber={1} />);

    const button = screen.getByTestId('downsamplingPhase-1h-label');
    fireEvent.click(button);

    expect(screen.getByTestId('downsamplingPopover-step1-title')).toBeInTheDocument();
    expect(screen.getByTestId('downsamplingPopover-step1-afterDataStored')).toBeInTheDocument();
    expect(screen.getByTestId('downsamplingPopover-step1-interval')).toBeInTheDocument();
  });

  it('should display phase name in popover for ILM', () => {
    render(<DownsamplingPhase downsample={downsample} stepNumber={1} phaseName="hot" />);

    const button = screen.getByTestId('downsamplingPhase-1h-label');
    fireEvent.click(button);

    expect(screen.getByTestId('downsamplingPopover-step1-definedIn')).toBeInTheDocument();
    expect(screen.getByTestId('downsamplingPopover-step1-phaseName')).toBeInTheDocument();
  });

  it('should display correct step number', () => {
    render(<DownsamplingPhase downsample={downsample} stepNumber={2} />);

    const button = screen.getByTestId('downsamplingPhase-1h-label');
    fireEvent.click(button);

    expect(screen.getByTestId('downsamplingPopover-step2-title')).toBeInTheDocument();
  });
});
