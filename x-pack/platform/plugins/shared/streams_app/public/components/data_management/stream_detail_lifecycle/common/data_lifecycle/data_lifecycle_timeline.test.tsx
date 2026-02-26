/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataLifecycleTimeline } from './data_lifecycle_timeline';
import type { LifecyclePhase } from './lifecycle_types';
import { buildDslSegments } from './data_lifecycle_segments';
import type { TimelineSegment } from './data_lifecycle_segments';
import type { PhaseName } from '@kbn/streams-schema';

describe('DataLifecycleTimeline', () => {
  const defaultProps = {
    phases: [] as LifecyclePhase[],
    isRetentionInfinite: false,
    gridTemplateColumns: '1fr',
  };

  describe('Basic rendering', () => {
    it('should render timeline with phase labels', () => {
      const phases: LifecyclePhase[] = [
        { grow: 5, color: '#FF0000', name: 'hot', min_age: '0d', label: 'hot' },
        { grow: 3, color: '#FFA500', name: 'warm', min_age: '30d', label: 'warm' },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          min_age: '60d',
          isDelete: true,
        },
      ];

      render(
        <DataLifecycleTimeline
          {...defaultProps}
          phases={phases}
          gridTemplateColumns="5fr 3fr 50px"
        />
      );

      expect(screen.getByText('0d')).toBeInTheDocument();
      expect(screen.getByText('30d')).toBeInTheDocument();
      expect(screen.getByText('60d')).toBeInTheDocument();
    });

    it('should render with custom timeline segments', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, color: '#FF0000', name: 'active', label: 'active' },
      ];
      const timelineSegments: TimelineSegment[] = [
        { grow: 3, leftValue: '0d' },
        { grow: 3, leftValue: '10d' },
        { grow: 3, leftValue: '20d' },
      ];

      render(
        <DataLifecycleTimeline
          {...defaultProps}
          phases={phases}
          timelineSegments={timelineSegments}
          gridTemplateColumns="3fr 3fr 3fr"
        />
      );

      expect(screen.getByText('0d')).toBeInTheDocument();
      expect(screen.getByText('10d')).toBeInTheDocument();
      expect(screen.getByText('20d')).toBeInTheDocument();
    });

    it('should mark decreasing timeline points as invalid', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, color: '#FF0000', name: 'hot', min_age: '0h', label: 'hot' },
        { grow: true, color: '#FFA500', name: 'warm', min_age: '28h', label: 'warm' },
        { grow: true, color: '#00FF00', name: 'cold', min_age: '15h', label: 'cold' },
      ];
      const timelineSegments: TimelineSegment[] = [
        { grow: 3, leftValue: '0h' },
        { grow: 3, leftValue: '28h' },
        { grow: 3, leftValue: '15h' },
      ];

      render(
        <DataLifecycleTimeline
          {...defaultProps}
          phases={phases}
          timelineSegments={timelineSegments}
          gridTemplateColumns="1fr 1fr 1fr"
          invalidPhases={['cold'] as PhaseName[]}
        />
      );

      expect(screen.getByTestId('dataLifecycleTimeline-value-28h')).not.toHaveAttribute(
        'data-is-invalid'
      );
      expect(screen.getByTestId('dataLifecycleTimeline-value-15h')).toHaveAttribute(
        'data-is-invalid',
        'true'
      );
    });

    it('should mark invalid step indices using DSL segment stepIndex mapping', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, color: '#FF0000', name: 'hot', min_age: '0d', label: 'hot' },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          min_age: '60d',
          isDelete: true,
        },
      ];

      const dslSegments = buildDslSegments(
        [
          { grow: 3, min_age: '0d' },
          { grow: 1, min_age: '60d', isDelete: true },
        ],
        [
          { after: '10d', fixed_interval: '1d' },
          { after: '20d', fixed_interval: '1d' },
        ]
      );

      render(
        <DataLifecycleTimeline
          {...defaultProps}
          phases={phases}
          timelineSegments={dslSegments.timelineSegments}
          gridTemplateColumns="1fr 1fr 1fr 50px"
          invalidStepIndices={[1]}
          invalidPhases={[] as PhaseName[]}
        />
      );

      expect(screen.getByTestId('dataLifecycleTimeline-value-10d')).not.toHaveAttribute(
        'data-is-invalid'
      );
      expect(screen.getByTestId('dataLifecycleTimeline-value-20d')).toHaveAttribute(
        'data-is-invalid',
        'true'
      );
    });
  });

  describe('Infinite retention', () => {
    it('should render infinity symbol when retention is infinite', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, color: '#FF0000', name: 'active', min_age: '0d', label: 'active' },
      ];

      render(
        <DataLifecycleTimeline
          {...defaultProps}
          phases={phases}
          isRetentionInfinite
          gridTemplateColumns="1fr"
        />
      );

      expect(screen.getByText('0d')).toBeInTheDocument();
      expect(screen.getByText('∞')).toBeInTheDocument();
    });

    it('should not render infinity symbol when retention is finite', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, color: '#FF0000', name: 'active', min_age: '0d', label: 'active' },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          min_age: '30d',
          isDelete: true,
        },
      ];

      render(
        <DataLifecycleTimeline
          {...defaultProps}
          phases={phases}
          isRetentionInfinite={false}
          gridTemplateColumns="1fr 50px"
        />
      );

      expect(screen.queryByText('∞')).not.toBeInTheDocument();
    });
  });

  describe('Delete phase handling', () => {
    it('should not show vertical line on right for delete phase', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, color: '#FF0000', name: 'active', min_age: '0d', label: 'active' },
        {
          grow: false,
          color: '#000000',
          name: 'delete',
          label: 'delete',
          min_age: '30d',
          isDelete: true,
        },
      ];

      const { container } = render(
        <DataLifecycleTimeline {...defaultProps} phases={phases} gridTemplateColumns="1fr 50px" />
      );

      // The component renders, we just verify it doesn't crash with delete phase
      expect(container).toBeInTheDocument();
    });
  });
});
