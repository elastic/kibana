/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DownsamplingBar } from './downsampling_bar';
import type { DownsamplingSegment } from './data_lifecycle_segments';

describe('DownsamplingBar', () => {
  const defaultProps = {
    gridTemplateColumns: '1fr',
  };

  describe('Rendering', () => {
    it('should render downsampling label', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '0d', fixed_interval: '1h' }, stepIndex: 0 },
      ];

      render(<DownsamplingBar {...defaultProps} segments={segments} />);

      expect(screen.getByTestId('downsamplingBar-label')).toBeInTheDocument();
    });

    it('should render downsampling step with interval', () => {
      const segments: DownsamplingSegment[] = [
        { grow: 5, step: { after: '10d', fixed_interval: '1h' }, stepIndex: 0 },
      ];

      render(<DownsamplingBar {...defaultProps} segments={segments} />);

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
});
