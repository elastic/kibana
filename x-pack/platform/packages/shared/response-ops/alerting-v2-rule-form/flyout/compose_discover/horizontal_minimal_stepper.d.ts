import React from 'react';
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
export declare const HorizontalMinimalStepper: React.FC<HorizontalMinimalStepperProps>;
