/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../common/mock';
import { GuidedTour } from './guided_tour';
import type { CasesTourStep } from './types';

// EuiTourStep renders its popover through EuiWrappingPopover, which does not mount its content in
// jsdom, so these tests cover the engine's gating logic (when it renders vs. not) rather than the
// popover contents. The step content/copy is validated by the per-page step configs.
const STEPS: CasesTourStep[] = [
  {
    stepId: 'a',
    title: 'Step A',
    anchor: '[data-test-subj="anchor-a"]',
    anchorPosition: 'downCenter',
    content: <span>{'Content A'}</span>,
  },
];

const Anchor = () => <button type="button" data-test-subj="anchor-a" aria-label="anchor" />;

describe('GuidedTour', () => {
  const scrollIntoViewMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  it('renders nothing when inactive', () => {
    renderWithTestingProviders(
      <>
        <Anchor />
        <GuidedTour steps={STEPS} isActive={false} onFinish={jest.fn()} testIdPrefix="test-tour" />
      </>
    );

    expect(screen.queryByTestId('test-tour-a')).not.toBeInTheDocument();
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('finishes immediately when active with no steps', () => {
    const onFinish = jest.fn();
    renderWithTestingProviders(
      <GuidedTour steps={[]} isActive onFinish={onFinish} testIdPrefix="test-tour" />
    );

    expect(onFinish).toHaveBeenCalled();
  });

  it('does not finish while inactive even with no steps', () => {
    const onFinish = jest.fn();
    renderWithTestingProviders(
      <GuidedTour steps={[]} isActive={false} onFinish={onFinish} testIdPrefix="test-tour" />
    );

    expect(onFinish).not.toHaveBeenCalled();
  });

  it('scrolls the active step anchor into view when the tour is active', () => {
    renderWithTestingProviders(
      <>
        <Anchor />
        <GuidedTour steps={STEPS} isActive onFinish={jest.fn()} testIdPrefix="test-tour" />
      </>
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('does not scroll when the tour is inactive', () => {
    renderWithTestingProviders(
      <>
        <Anchor />
        <GuidedTour steps={STEPS} isActive={false} onFinish={jest.fn()} testIdPrefix="test-tour" />
      </>
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
