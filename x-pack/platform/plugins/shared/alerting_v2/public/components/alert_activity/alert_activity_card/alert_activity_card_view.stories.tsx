/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { AlertSummaryResponse } from '@kbn/alerting-v2-schemas';
import { AlertActivityCardView } from './alert_activity_card_view';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const buildSeries = (
  startMs: number,
  count: number,
  interval: number,
  shape: (i: number) => number
) => {
  return Array.from({ length: count }, (_, i) => {
    const ts = startMs + i * interval;
    return {
      key: ts,
      key_as_string: new Date(ts).toISOString(),
      doc_count: Math.max(0, Math.round(shape(i))),
    };
  });
};

const START = new Date('2025-04-01T00:00:00.000Z').getTime();

const singleRuleData: AlertSummaryResponse = {
  activeEventCount: 37,
  recoveredEventCount: 31,
  activeSeries: buildSeries(START, 24, HOUR_MS, (i) => Math.sin(i / 3) * 2 + 2 + (i > 12 ? 1 : 0)),
  recoveredSeries: buildSeries(START, 24, HOUR_MS, (i) => Math.sin(i / 3 - 1) * 2 + 2),
};

const multiRuleData: AlertSummaryResponse = {
  activeEventCount: 213,
  recoveredEventCount: 198,
  activeSeries: buildSeries(START, 30, DAY_MS, (i) => 4 + Math.sin(i / 2) * 4 + i / 3),
  recoveredSeries: buildSeries(START, 30, DAY_MS, (i) => 3 + Math.sin(i / 2 - 0.5) * 3 + i / 4),
};

const meta: Meta<typeof AlertActivityCardView> = {
  title: 'Alerting V2/Alert Activity/Card',
  component: AlertActivityCardView,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof AlertActivityCardView>;

export const Loading: Story = {
  args: {
    isLoading: true,
    lookbackLabel: 'Last 24 hours',
  },
};

export const ErrorState: Story = {
  args: {
    isError: true,
    lookbackLabel: 'Last 24 hours',
  },
};

export const Empty: Story = {
  args: {
    data: {
      activeEventCount: 0,
      recoveredEventCount: 0,
      activeSeries: [],
      recoveredSeries: [],
    },
    lookbackLabel: 'Last 24 hours',
  },
};

export const SingleRuleWithData: Story = {
  args: {
    data: singleRuleData,
    lookbackLabel: 'Last 24 hours',
  },
};

export const MultiRuleWithData: Story = {
  args: {
    data: multiRuleData,
    lookbackLabel: 'Last 30 days',
  },
};

export const LongWindow: Story = {
  args: {
    data: {
      activeEventCount: 540,
      recoveredEventCount: 510,
      activeSeries: buildSeries(START, 90, DAY_MS, (i) => 6 + Math.sin(i / 4) * 4 + i / 5),
      recoveredSeries: buildSeries(START, 90, DAY_MS, (i) => 5 + Math.sin(i / 4 - 1) * 4 + i / 6),
    },
    lookbackLabel: 'Last 90 days',
  },
};
