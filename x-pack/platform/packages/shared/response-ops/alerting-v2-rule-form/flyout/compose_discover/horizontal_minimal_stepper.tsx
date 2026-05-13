/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ClassNames } from '@emotion/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useHorizontalMinimalStepperStyles } from './horizontal_minimal_stepper.styles';

/** Mirrors the status subset used by EuiStepsHorizontal. */
export type MinimalStepStatus = 'current' | 'complete' | 'incomplete';

export interface MinimalStep {
  title: string;
  status: MinimalStepStatus;
}

export interface HorizontalMinimalStepperProps {
  /** Steps with their current status — same shape as EuiStepsHorizontal steps (subset). */
  steps: MinimalStep[];
}

/**
 * Minimal horizontal stepper for compact flyout headers.
 *
 * Renders a row of small indicators (dots + pill for current step), a bold
 * current-step title, and a muted N / N counter.
 *
 * Animation respects `prefers-reduced-motion` automatically via the
 * `euiCanAnimate` CSS media query in the styles file.
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
export const HorizontalMinimalStepper: React.FC<HorizontalMinimalStepperProps> = ({ steps }) => {
  const euiThemeContext = useEuiTheme();
  const { indicatorByStatus, indicatorRow } = useHorizontalMinimalStepperStyles(euiThemeContext);

  const currentIndex = steps.findIndex((s) => s.status === 'current');
  const displayIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentTitle = currentIndex >= 0 ? steps[currentIndex].title : '';
  const total = steps.length;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      role="group"
      aria-label={`Step ${displayIndex + 1} of ${total}: ${currentTitle}`}
    >
      {/* Step indicators — decorative, described by the group aria-label.
          ClassNames converts SerializedStyles → real CSS class names so we can
          use className on plain divs without needing the Emotion JSX transform. */}
      <EuiFlexItem grow={false}>
        <ClassNames>
          {({ css }) => (
            <div className={css(indicatorRow)} aria-hidden>
              {steps.map((step, i) => (
                <div key={i} className={css(indicatorByStatus[step.status])} />
              ))}
            </div>
          )}
        </ClassNames>
      </EuiFlexItem>

      {/* Current step title */}
      <EuiFlexItem grow={false}>
        <EuiText size="s" aria-current="step">
          <strong>{currentTitle}</strong>
        </EuiText>
      </EuiFlexItem>

      {/* Spacer */}
      <EuiFlexItem grow />

      {/* N / N counter */}
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" aria-label={`Step ${displayIndex + 1} of ${total}`}>
          {displayIndex + 1} / {total}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
