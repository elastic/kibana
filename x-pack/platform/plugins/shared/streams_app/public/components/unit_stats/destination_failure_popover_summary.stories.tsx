/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { EMPTY_DESTINATION_FAILED } from '../../services/unit_stats_client/map_stats_response';
import type {
  DestinationFailedView,
  FailureClassView,
} from '../../services/unit_stats_client/types';
import { DestinationFailurePopoverSummary } from './destination_failure_popover_summary';
import { placeholderFailureSeries } from './placeholder_failure_series';

const meta: Meta<typeof DestinationFailurePopoverSummary> = {
  component: DestinationFailurePopoverSummary,
  title: 'streams/unit stats/DestinationFailurePopoverSummary',
  args: { minutes: 15 },
  // The width of the popover on the Map node.
  decorators: [
    (Story) => (
      <EuiPanel hasBorder style={{ inlineSize: 368 }}>
        <Story />
      </EuiPanel>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DestinationFailurePopoverSummary>;

// A fixed time, so the same story draws the same line every time.
const END_MS = Date.parse('2026-11-16T20:00:00.000Z');

/** A class with failures. Its sparkline is a placeholder line, unless `hasSeries` is false. */
const failureClass = ({
  rate,
  percentage,
  unit = '{item}',
  hasSeries = true,
}: {
  rate: number;
  percentage: number;
  unit?: string;
  hasSeries?: boolean;
}): FailureClassView => ({
  rate,
  unit,
  percentage,
  breakdown: [],
  ...(hasSeries
    ? {
        series: placeholderFailureSeries({
          endPercentage: percentage,
          trend: 'rising',
          endMs: END_MS,
        }),
      }
    : {}),
});

const failed = (overrides: Partial<DestinationFailedView>): DestinationFailedView => ({
  ...EMPTY_DESTINATION_FAILED,
  ...overrides,
});

export const BothClasses: Story = {
  args: {
    failed: failed({
      authentication: failureClass({ rate: 0.5, percentage: 11.9 }),
      authorization: failureClass({ rate: 1.9, percentage: 45.2 }),
    }),
  },
};

export const AuthenticationOnly: Story = {
  args: { failed: failed({ authentication: failureClass({ rate: 0.5, percentage: 11.9 }) }) },
};

export const AuthorizationOnly: Story = {
  args: { failed: failed({ authorization: failureClass({ rate: 1.9, percentage: 45.2 }) }) },
};

/** S3 counts upload attempts, so the subtitle names them. */
export const S3UploadAttempts: Story = {
  args: {
    failed: failed({
      authentication: failureClass({ rate: 2, percentage: 35, unit: '{request}' }),
      authorization: failureClass({ rate: 0.3, percentage: 5, unit: '{request}' }),
    }),
  },
};

/** No series, so no sparkline: the percentage and the rate stand alone. */
export const NoSeries: Story = {
  args: {
    failed: failed({
      authentication: failureClass({ rate: 0.5, percentage: 11.9, hasSeries: false }),
    }),
  },
};
