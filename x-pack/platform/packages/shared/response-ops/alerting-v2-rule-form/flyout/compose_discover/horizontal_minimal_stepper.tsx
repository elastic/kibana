/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

/** Mirrors the status subset used by EuiStepsHorizontal. */
export type MinimalStepStatus = 'current' | 'complete' | 'incomplete';

export interface MinimalStep {
  title: string;
  status: MinimalStepStatus;
}

export interface HorizontalMinimalStepperProps {
  /** Steps with their current status — same shape as EuiStepsHorizontal steps (subset). */
  steps: MinimalStep[];
  /**
   * When true, indicators animate on step change using a spring curve.
   * Defaults to true. Pass false to disable for testing or reduced-motion contexts.
   */
  animated?: boolean;
}

/**
 * Minimal horizontal stepper for compact flyout headers.
 *
 * Renders a row of small indicators (dots + pill for current step), a bold
 * current-step title, and a muted N / N counter.
 *
 * Layout is intentionally self-contained — place alongside other elements
 * using standard EuiFlexGroup/EuiFlexItem outside this component:
 *
 *   <EuiFlexGroup alignItems="center">
 *     <EuiFlexItem grow>
 *       <HorizontalMinimalStepper steps={steps} />
 *     </EuiFlexItem>
 *     <EuiFlexItem grow={false}>
 *       <EuiButtonGroup ... isIconOnly />
 *     </EuiFlexItem>
 *   </EuiFlexGroup>
 */
export const HorizontalMinimalStepper: React.FC<HorizontalMinimalStepperProps> = ({
  steps,
  animated = true,
}) => {
  const { euiTheme } = useEuiTheme();

  const DOT_SIZE = 8;
  const BAR_WIDTH = 24;
  const BAR_HEIGHT = DOT_SIZE;
  const GAP = 4;

  const activeColor = euiTheme.colors.primary;
  const futureColor = euiTheme.colors.lightShade;

  const currentIndex = steps.findIndex((s) => s.status === 'current');
  const currentTitle = currentIndex >= 0 ? steps[currentIndex].title : '';
  const total = steps.length;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const transition =
    animated && !prefersReducedMotion
      ? 'width 220ms cubic-bezier(0.34, 1.56, 0.64, 1), ' +
        'border-radius 220ms cubic-bezier(0.34, 1.56, 0.64, 1), ' +
        'background-color 150ms ease'
      : undefined;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {/* Step indicators */}
      <EuiFlexItem grow={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: GAP }}>
          {steps.map((step, i) => {
            const isCurrent = step.status === 'current';
            const isComplete = step.status === 'complete';

            return (
              <div
                key={i}
                style={{
                  width: isCurrent ? BAR_WIDTH : DOT_SIZE,
                  height: isCurrent ? BAR_HEIGHT : DOT_SIZE,
                  borderRadius: isCurrent ? BAR_HEIGHT / 2 : '50%',
                  backgroundColor: isCurrent || isComplete ? activeColor : futureColor,
                  flexShrink: 0,
                  transition,
                }}
              />
            );
          })}
        </div>
      </EuiFlexItem>

      {/* Current step title */}
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{currentTitle}</strong>
        </EuiText>
      </EuiFlexItem>

      {/* Spacer */}
      <EuiFlexItem grow />

      {/* N / N counter */}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {currentIndex + 1} / {total}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
