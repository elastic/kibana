/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiText, useEuiTheme } from '@elastic/eui';
import chroma from 'chroma-js';
import { LifecycleTimeline } from '../lifecycle_timeline';
import type { LifecycleTimelinePeriod } from '../types';

const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

interface ExampleTimelineArgs {
  recentMaxAge: { label: string; valueInMs: number };
  olderMaxAge: { label: string; valueInMs: number };
  retention?: string;
  withSizes: boolean;
  width?: number;
}

const ExampleTimeline = ({
  recentMaxAge,
  olderMaxAge,
  retention,
  withSizes,
  width,
}: ExampleTimelineArgs) => {
  const { euiTheme } = useEuiTheme();
  const recentColor = euiTheme.colors.backgroundFilledPrimary;
  const oldestColor = euiTheme.colors.borderBasePrimary;

  const periods: LifecycleTimelinePeriod[] = [
    {
      id: 'recent',
      label: 'Recent',
      color: recentColor,
      maxAge: recentMaxAge,
      size: withSizes ? '12 GB' : undefined,
      tooltipContent: 'Details for recent data',
    },
    {
      id: 'older',
      label: 'Older',
      color: chroma.mix(recentColor, oldestColor, 0.5).hex(),
      maxAge: olderMaxAge,
      size: withSizes ? '40 GB' : undefined,
      tooltipContent: 'Details for older data',
    },
    {
      id: 'oldest',
      label: 'Oldest',
      color: oldestColor,
      size: withSizes ? '148 GB' : undefined,
      tooltipContent: 'Details for oldest data',
    },
  ];

  return (
    <div css={{ width: width ?? 640 }}>
      <LifecycleTimeline
        periods={periods}
        retention={retention}
        aria-label="Periods by age of data"
      />
    </div>
  );
};

const meta: Meta<typeof ExampleTimeline> = {
  title: 'Data Lifecycle Phases / Lifecycle timeline',
  component: ExampleTimeline,
  args: {
    recentMaxAge: { label: '12h', valueInMs: 12 * HOUR_IN_MS },
    olderMaxAge: { label: '3d', valueInMs: 3 * DAY_IN_MS },
    withSizes: true,
  },
};

export default meta;
type Story = StoryObj<typeof ExampleTimeline>;

export const Default: Story = {};

export const RetentionValueWithoutSizes: Story = {
  args: { retention: '30d', withSizes: false },
};

export const MiddlePeriodSkipped: Story = {
  args: {
    recentMaxAge: { label: '7d', valueInMs: 7 * DAY_IN_MS },
    olderMaxAge: { label: '5d', valueInMs: 5 * DAY_IN_MS },
  },
};

export const TooltipAndPopover: Story = {
  render: () => <PopoverTimeline />,
};

const PopoverTimeline = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <div css={{ width: 640 }}>
      <LifecycleTimeline
        aria-label="Data phases"
        retention="90d"
        periods={[
          {
            id: 'hot',
            label: 'Hot',
            color: euiTheme.colors.severity.risk,
            maxAge: { label: '7d', valueInMs: 7 * DAY_IN_MS },
            size: '1.2 GB',
            tooltipContent: 'Tooltip on hover, popover on click',
            popoverContent: (
              <EuiText size="s">
                <p>Popover content passed in by the consumer.</p>
              </EuiText>
            ),
            onClick: action('onClick hot'),
          },
          {
            id: 'warm',
            label: 'Warm',
            color: euiTheme.colors.severity.warning,
            maxAge: { label: '30d', valueInMs: 30 * DAY_IN_MS },
            size: '3.4 GB',
            onClick: action('onClick warm'),
          },
          {
            id: 'cold',
            label: 'Cold',
            color: euiTheme.colors.severity.neutral,
            size: '8.9 GB',
          },
        ]}
      />
    </div>
  );
};
