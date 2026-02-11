/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  DataLifecycleSummary,
  buildLifecyclePhases,
  type LifecyclePhase,
} from './data_lifecycle_summary';

describe('DataLifecycleSummary', () => {
  describe('Loading State', () => {
    it('should show skeleton when data is being fetched', () => {
      const phases: LifecyclePhase[] = [];
      render(<DataLifecycleSummary phases={phases} loading={true} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.getByTestId('dataLifecycleSummary-skeleton')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render title with no phases when phases array is empty', () => {
      const phases: LifecyclePhase[] = [];
      render(<DataLifecycleSummary phases={phases} />);

      expect(screen.getByTestId('dataLifecycleSummary-title')).toBeInTheDocument();
      expect(screen.queryByTestId('dataLifecycleSummary-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Phase Rendering', () => {
    it('should render phases with labels and sizes', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          label: 'hot',
          size: '1.0 MB',
          grow: 5,
          timelineValue: '30d',
        },
        {
          color: '#FFA500',
          label: 'warm',
          size: '500.0 KB',
          grow: 3,
          timelineValue: '60d',
        },
        {
          grow: false,
          isDelete: true,
        },
      ];

      render(<DataLifecycleSummary phases={phases} />);

      expect(screen.getByTestId('lifecyclePhase-hot-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-warm-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-hot-size')).toHaveTextContent('1.0 MB');
      expect(screen.getByTestId('lifecyclePhase-warm-size')).toHaveTextContent('500.0 KB');
      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });

    it('should render single phase with delete icon', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#00FF00',
          label: 'Main phase',
          size: '2.0 GB',
          grow: true,
          timelineValue: '30d',
        },
        { grow: false, isDelete: true },
      ];

      render(<DataLifecycleSummary phases={phases} />);

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
          label: 'Main phase',
          size: '2.0 GB',
          grow: true,
        },
      ];

      render(<DataLifecycleSummary phases={phases} />);

      expect(screen.getByTestId('lifecyclePhase-Main phase-name')).toBeInTheDocument();
      expect(screen.queryByTestId('dataLifecycle-delete-icon')).not.toBeInTheDocument();
    });

    it('should render infinite symbol when no timelineValue is provided', () => {
      const phases: LifecyclePhase[] = [
        {
          color: '#FF0000',
          label: 'Main phase',
          size: '50.0 KB',
          grow: true,
        },
      ];

      render(<DataLifecycleSummary phases={phases} />);

      expect(screen.getByText('∞')).toBeInTheDocument();
    });
  });
});

describe('buildLifecyclePhases', () => {
  it('should build phases with delete phase when retentionPeriod is provided', () => {
    const phases = buildLifecyclePhases({
      label: 'Test phase',
      color: '#FF0000',
      size: '1.0 GB',
      retentionPeriod: '30d',
    });

    expect(phases).toHaveLength(2);
    expect(phases[0]).toEqual({
      color: '#FF0000',
      label: 'Test phase',
      size: '1.0 GB',
      grow: true,
      timelineValue: '30d',
    });
    expect(phases[1]).toEqual({
      grow: false,
      isDelete: true,
    });
  });

  it('should build phases without delete phase when retentionPeriod is undefined (infinite)', () => {
    const phases = buildLifecyclePhases({
      label: 'Test phase',
      color: '#00FF00',
      size: '2.0 GB',
      retentionPeriod: undefined,
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]).toEqual({
      color: '#00FF00',
      label: 'Test phase',
      size: '2.0 GB',
      grow: true,
      timelineValue: undefined,
    });
  });

  it('should build phases without size when size is not provided', () => {
    const phases = buildLifecyclePhases({
      label: 'Test phase',
      color: '#FF0000',
      retentionPeriod: '7d',
    });

    expect(phases).toHaveLength(2);
    expect(phases[0].size).toBeUndefined();
  });
});
