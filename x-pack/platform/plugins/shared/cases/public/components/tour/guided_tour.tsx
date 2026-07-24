/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiTourStep } from '@elastic/eui';
import type { CasesTourStep } from './types';
import { useIsAnchorMounted } from './use_is_anchor_mounted';
import * as i18n from './translations';

const DEFAULT_POPOVER_WIDTH = 360;

/**
 * If a step's anchor never mounts (e.g. the control collapsed into a header overflow menu, or a
 * conditionally-rendered panel that isn't present for this case/config), skip to the next step
 * after this delay rather than leaving the tour stuck. Advancing past the last step ends the tour.
 */
const ANCHOR_TIMEOUT_MS = 4000;

export interface GuidedTourProps {
  /** Ordered steps to walk through. */
  steps: CasesTourStep[];
  /** Whether the tour is currently running. The parent owns this (and any persisted state). */
  isActive: boolean;
  /** Called when the tour completes, is skipped, or hits the anchor safety valve. */
  onFinish: () => void;
  /** Prefix for step data-test-subjs (e.g. "cases-list-tour-step"). */
  testIdPrefix: string;
  popoverWidth?: number;
}

/**
 * A reusable multi-step guided tour built on EuiTourStep. Each step anchors its popover to an
 * existing element via a CSS selector, so this component renders no page content of its own.
 * Progression and the anchor-mount guard are handled internally; the parent controls when the
 * tour runs (`isActive`) and reacts to completion (`onFinish`).
 */
const GuidedTourComponent: React.FC<GuidedTourProps> = ({
  steps,
  isActive,
  onFinish,
  testIdPrefix,
  popoverWidth = DEFAULT_POPOVER_WIDTH,
}) => {
  // 1-based, matching EuiTourStep's `step` prop.
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Restart from the first step whenever the tour (re)activates.
  useEffect(() => {
    if (isActive) {
      setCurrentStep(1);
    }
  }, [isActive]);

  const stepsTotal = steps.length;
  const currentStepConfig = steps[currentStep - 1];
  const isCurrentAnchorMounted = useIsAnchorMounted(currentStepConfig?.anchor ?? 'body');

  const nextStep = useCallback(() => setCurrentStep((prev) => prev + 1), []);

  // Anchor safety valve: if the active step's anchor never mounts, skip to the next step rather
  // than leaving the tour stuck. `currentStep` running past the last step makes `currentStepConfig`
  // undefined, and this same effect then finishes the tour.
  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (!currentStepConfig) {
      onFinish();
      return;
    }
    if (isCurrentAnchorMounted) {
      return;
    }
    const timer = setTimeout(() => setCurrentStep((prev) => prev + 1), ANCHOR_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isActive, currentStepConfig, isCurrentAnchorMounted, onFinish]);

  // Only mount `EuiTourStep` once the current step's anchor is in the DOM. EuiTourStep resolves
  // its anchor a tick after mount; rendering before the anchor exists produces an unanchored
  // popover that never recovers.
  //
  // Scroll the active step's anchor into view so the tour doesn't open off-screen (e.g. the
  // attach button at the bottom of a long case activity thread).
  useEffect(() => {
    if (!isActive || !currentStepConfig || !isCurrentAnchorMounted) {
      return;
    }
    const anchorEl = document.querySelector(currentStepConfig.anchor);
    // jsdom does not implement scrollIntoView; guard so tours used in unit tests do not crash.
    if (anchorEl && typeof anchorEl.scrollIntoView === 'function') {
      anchorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStepConfig, isCurrentAnchorMounted]);

  if (!isActive || !currentStepConfig || !isCurrentAnchorMounted) {
    return null;
  }

  const isLastStep = currentStep === stepsTotal;

  return (
    <EuiTourStep
      // Remount per step. EuiTourStep uses EuiWrappingPopover, which physically moves the anchor
      // element into the popover and only restores it on unmount. Keying by step forces a clean
      // unmount/remount so each step re-anchors correctly.
      key={currentStepConfig.stepId}
      anchor={currentStepConfig.anchor}
      anchorPosition={currentStepConfig.anchorPosition}
      content={currentStepConfig.content}
      title={currentStepConfig.title}
      step={currentStep}
      stepsTotal={stepsTotal}
      isStepOpen
      minWidth={popoverWidth}
      maxWidth={popoverWidth}
      onFinish={onFinish}
      data-test-subj={`${testIdPrefix}-${currentStepConfig.stepId}`}
      footerAction={
        isLastStep ? (
          <EuiButton
            color="success"
            size="s"
            onClick={onFinish}
            data-test-subj={`${testIdPrefix}-finish`}
          >
            {i18n.TOUR_FINISH}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              key="skip"
              size="s"
              color="text"
              onClick={onFinish}
              data-test-subj={`${testIdPrefix}-skip`}
            >
              {i18n.TOUR_SKIP}
            </EuiButtonEmpty>,
            <EuiButton
              key="next"
              color="success"
              size="s"
              onClick={nextStep}
              data-test-subj={`${testIdPrefix}-next`}
            >
              {i18n.TOUR_NEXT}
            </EuiButton>,
          ]
        )
      }
    />
  );
};

GuidedTourComponent.displayName = 'GuidedTour';

export const GuidedTour = React.memo(GuidedTourComponent);
