/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { HorizontalMinimalStepper, type MinimalStep } from '../horizontal_minimal_stepper';

const meta: Meta<typeof HorizontalMinimalStepper> = {
  title: 'Alerting V2/Compose Discover/HorizontalMinimalStepper',
  component: HorizontalMinimalStepper,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof HorizontalMinimalStepper>;

// ---------------------------------------------------------------------------
// Helper to build step arrays from a current index
// ---------------------------------------------------------------------------
const makeSteps = (titles: string[], currentIndex: number): MinimalStep[] =>
  titles.map((title, i) => ({
    title,
    status: i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'incomplete',
  }));

const RULE_STEPS = [
  'Alert Condition',
  'Recovery Condition',
  'Details & Artifacts',
  'Notifications',
];
const RULE_STEPS_SHORT = ['Alert Condition', 'Details & Artifacts', 'Notifications'];

// ---------------------------------------------------------------------------
// Interactive story — click through steps to see the animation
// ---------------------------------------------------------------------------
const InteractiveStory = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = makeSteps(RULE_STEPS, currentStep);

  return (
    <div style={{ maxWidth: 480, border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
      <HorizontalMinimalStepper steps={steps} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          >
            ← Back
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            disabled={currentStep === RULE_STEPS.length - 1}
            onClick={() => setCurrentStep((s) => Math.min(RULE_STEPS.length - 1, s + 1))}
          >
            Next →
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        Click Next/Back to see the dot→pill animation on the indicators.
      </EuiText>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveStory />,
};

// ---------------------------------------------------------------------------
// All four states shown at once
// ---------------------------------------------------------------------------
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480 }}>
      {RULE_STEPS.map((_, i) => (
        <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <HorizontalMinimalStepper steps={makeSteps(RULE_STEPS, i)} />
        </div>
      ))}
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Three-step variant (no Recovery Condition — tracking disabled)
// ---------------------------------------------------------------------------
const ThreeStepsStory = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = makeSteps(RULE_STEPS_SHORT, currentStep);

  return (
    <div style={{ maxWidth: 480, border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
      <HorizontalMinimalStepper steps={steps} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            ← Back
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            disabled={currentStep === RULE_STEPS_SHORT.length - 1}
            onClick={() => setCurrentStep((s) => s + 1)}
          >
            Next →
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        Three-step variant shown when &quot;Track active and recovered state&quot; is disabled (no
        Recovery Condition step).
      </EuiText>
    </div>
  );
};

export const ThreeSteps: Story = {
  render: () => <ThreeStepsStory />,
};
