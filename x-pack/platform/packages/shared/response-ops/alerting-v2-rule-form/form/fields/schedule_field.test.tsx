/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScheduleField } from './schedule_field';
import { createFormWrapper } from '../../test_utils';

describe('ScheduleField', () => {
  it('renders the schedule label', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('renders help text', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    expect(screen.getByText('Set the frequency to check the alert conditions')).toBeInTheDocument();
  });

  it('renders tooltip icon', () => {
    render(<ScheduleField />, { wrapper: createFormWrapper() });

    // The EuiIconTip renders a span with "Info" text
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('displays initial schedule value', () => {
    render(<ScheduleField />, {
      wrapper: createFormWrapper({
        schedule: { every: '5m', lookback: '1m' },
      }),
    });

    // The RuleSchedule component should render with the value
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });
});
