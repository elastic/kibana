/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LifecycleBar } from './lifecycle_bar';
import type { LifecyclePhase } from './lifecycle_types';

describe('LifecycleBar', () => {
  const defaultProps = {
    phases: [] as LifecyclePhase[],
    gridTemplateColumns: '1fr',
    phaseColumnSpans: [1],
  };

  describe('Rendering', () => {
    it('should render phases with labels', () => {
      const phases: LifecyclePhase[] = [
        { grow: 5, name: 'hot', label: 'hot', color: '#FF0000' },
        { grow: 3, name: 'warm', label: 'warm', color: '#FFA500' },
      ];

      render(
        <LifecycleBar
          {...defaultProps}
          phases={phases}
          gridTemplateColumns="5fr 3fr"
          phaseColumnSpans={[1, 1]}
        />
      );

      expect(screen.getByTestId('lifecyclePhase-hot-name')).toBeInTheDocument();
      expect(screen.getByTestId('lifecyclePhase-warm-name')).toBeInTheDocument();
    });

    it('should render phases with sizes', () => {
      const phases: LifecyclePhase[] = [
        { grow: 5, name: 'hot', label: 'hot', color: '#FF0000', size: '1.0 GB' },
        { grow: 3, name: 'warm', label: 'warm', color: '#FFA500', size: '500 MB' },
      ];

      render(
        <LifecycleBar
          {...defaultProps}
          phases={phases}
          gridTemplateColumns="5fr 3fr"
          phaseColumnSpans={[1, 1]}
        />
      );

      expect(screen.getByTestId('lifecyclePhase-hot-size')).toHaveTextContent('1.0 GB');
      expect(screen.getByTestId('lifecyclePhase-warm-size')).toHaveTextContent('500 MB');
    });

    it('should render delete phase with trash icon', () => {
      const phases: LifecyclePhase[] = [
        { grow: true, name: 'hot', label: 'hot', color: '#FF0000' },
        { grow: false, color: '#000000', name: 'delete', label: 'delete', isDelete: true },
      ];

      render(
        <LifecycleBar
          {...defaultProps}
          phases={phases}
          gridTemplateColumns="1fr 50px"
          phaseColumnSpans={[1, 1]}
        />
      );

      expect(screen.getByTestId('dataLifecycle-delete-icon')).toBeInTheDocument();
    });
  });

  describe('Click handling', () => {
    it('should call onPhaseClick when phase is clicked', () => {
      const onPhaseClick = jest.fn();
      const phases: LifecyclePhase[] = [
        { grow: true, name: 'hot', label: 'hot', color: '#FF0000' },
      ];

      render(
        <LifecycleBar
          {...defaultProps}
          phases={phases}
          onPhaseClick={onPhaseClick}
          phaseColumnSpans={[1]}
        />
      );

      const phaseButton = screen.getByTestId('lifecyclePhase-hot-name').closest('[role="button"]');
      fireEvent.click(phaseButton!);

      expect(onPhaseClick).toHaveBeenCalledWith(phases[0], 0);
    });

    it('should call onPhaseClick with correct index for multiple phases', () => {
      const onPhaseClick = jest.fn();
      const phases: LifecyclePhase[] = [
        { grow: 5, name: 'hot', label: 'hot', color: '#FF0000' },
        { grow: 3, name: 'warm', label: 'warm', color: '#FFA500' },
      ];

      render(
        <LifecycleBar
          {...defaultProps}
          phases={phases}
          gridTemplateColumns="5fr 3fr"
          phaseColumnSpans={[1, 1]}
          onPhaseClick={onPhaseClick}
        />
      );

      const warmPhaseButton = screen
        .getByTestId('lifecyclePhase-warm-name')
        .closest('[role="button"]');
      fireEvent.click(warmPhaseButton!);

      expect(onPhaseClick).toHaveBeenCalledWith(phases[1], 1);
    });
  });
});
