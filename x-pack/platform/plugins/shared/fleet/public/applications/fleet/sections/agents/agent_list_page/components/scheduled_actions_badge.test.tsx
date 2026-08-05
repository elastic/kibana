/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { ScheduledActionsBadge } from './scheduled_actions_badge';

describe('ScheduledActionsBadge', () => {
  function render(props: React.ComponentProps<typeof ScheduledActionsBadge>) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<ScheduledActionsBadge {...props} />);
  }

  it('renders nothing when scheduledActionsCount is 0', () => {
    const { queryByTestId } = render({ scheduledActionsCount: 0, onClick: jest.fn() });
    expect(queryByTestId('scheduledActionsBadge')).toBeNull();
  });

  it('renders the badge when scheduledActionsCount > 0', () => {
    const { getByTestId } = render({ scheduledActionsCount: 3, onClick: jest.fn() });
    expect(getByTestId('scheduledActionsBadge')).toBeInTheDocument();
  });

  it('calls onClick when the badge is clicked', () => {
    const onClick = jest.fn();
    const { getByTestId } = render({ scheduledActionsCount: 1, onClick });
    fireEvent.click(getByTestId('scheduledActionsBadge'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has an accessible aria label', () => {
    const { getByTestId } = render({ scheduledActionsCount: 2, onClick: jest.fn() });
    expect(getByTestId('scheduledActionsBadge')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('unenrollment')
    );
  });
});
