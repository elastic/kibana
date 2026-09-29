/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SolutionViewSwitchTour } from './solution_view_switch_tour';

const mockTourQueueState = { isActive: false };
const mockOnComplete = vi.fn();

vi.mock('@kbn/tour-queue', () => {
      const mocked = {
      TOURS: { SPACES_SOLUTION_VIEW_SWITCH: 'spacesSolutionViewSwitchTour' },
      useTourQueue: () => ({ isActive: mockTourQueueState.isActive, onComplete: mockOnComplete }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./solution_view_switch_tour_component', () => {
      const mocked = {
      SolutionViewSwitchTourComponent: ({ isOpen, onFinish, onClickSpaceSettings }: any) => (
        <div>
          <div data-test-subj="isOpen">{String(isOpen)}</div>
          <button data-test-subj="dismiss" onClick={onFinish}>
            dismiss
          </button>
          <button data-test-subj="settings" onClick={onClickSpaceSettings}>
            settings
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

describe('SolutionViewSwitchTour', () => {
  beforeEach(() => {
    mockOnComplete.mockClear();
    mockTourQueueState.isActive = false;
  });

  it('passes queue active state to component', () => {
    mockTourQueueState.isActive = false;
    render(
      <SolutionViewSwitchTour
        anchor="[data-test-subj='test-anchor']"
        solution="oblt"
        onFinish={vi.fn()}
        onClickSpaceSettings={vi.fn()}
      />
    );
    expect(screen.getByTestId('isOpen').textContent).toBe('false');
  });

  it('calls onComplete when finishing', async () => {
    const user = userEvent.setup();
    mockTourQueueState.isActive = true;

    const onFinish = vi.fn();

    render(
      <SolutionViewSwitchTour
        anchor="[data-test-subj='test-anchor']"
        solution="oblt"
        onFinish={onFinish}
        onClickSpaceSettings={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('dismiss'));

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
