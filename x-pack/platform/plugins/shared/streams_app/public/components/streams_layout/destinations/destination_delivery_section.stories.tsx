/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  STATS_FIXTURE_RESPONSES,
  type StatsFixtureScenario,
} from '../../../services/unit_stats_client/fixture_unit_stats_client';
import { mapStatsResponse } from '../../../services/unit_stats_client/map_stats_response';
import { DestinationDeliveryView } from './destination_delivery_section';

const meta: Meta<typeof DestinationDeliveryView> = {
  component: DestinationDeliveryView,
  title: 'streams/destinations/DestinationDeliveryView',
  // The width of the flyout at its widest (`UNIT_DESTINATION_FLYOUT_MAX_WIDTH`), and the padding of
  // its body, so that the panel has the room that it has there.
  decorators: [
    (Story) => (
      <div
        style={{ inlineSize: 1125, maxInlineSize: '100%', padding: 24, boxSizing: 'border-box' }}
      >
        <Story />
      </div>
    ),
  ],
  // The picker reads the page's time filter, which a story does not have.
  args: {
    destinationType: 'elasticsearch',
    panelRole: 'failures',
    loading: false,
    showTimePicker: false,
  },
};

export default meta;
type Story = StoryObj<typeof DestinationDeliveryView>;

const fixtureValue = (scenario: StatsFixtureScenario, destinationId: string) =>
  mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], [{ kind: 'destination', id: destinationId }])
    .destinations[destinationId];

/** The stats of a destination that delivered everything, with a series of what it delivered. */
const healthyValue = () => {
  const { stats, ...entry } = fixtureValue('authFailures', 'es-dev');
  const { series } = stats.failed;

  return {
    ...entry,
    stats: {
      ...stats,
      failed: {
        ...stats.failed,
        authentication: { ...stats.failed.authentication, rate: 0, percentage: 0, breakdown: [] },
        authorization: { ...stats.failed.authorization, rate: 0, percentage: 0, breakdown: [] },
        series: series && {
          ...series,
          points: series.points.map((point) => ({
            ...point,
            failed: 0,
            authentication: 0,
            authorization: 0,
          })),
        },
      },
    },
  };
};

/** The stats of a destination that fails 40% of its attempts, none of them in either class. */
const otherFailuresValue = () => {
  const { stats, ...entry } = healthyValue();
  const { series } = stats.failed;

  return {
    ...entry,
    stats: {
      ...stats,
      failed: {
        ...stats.failed,
        total: { rate: 1.7, unit: '{item}', percentage: 40 },
        series: series && {
          ...series,
          points: series.points.map((point) => ({
            ...point,
            failed: Math.round(point.total * 0.4),
          })),
        },
      },
    },
  };
};

/** The query for the classes failed, and the series loaded. */
const partialErrorWithSeriesValue = () => {
  const partial = fixtureValue('partialFailure', 'es-dev');

  return {
    ...partial,
    stats: {
      ...partial.stats,
      failed: { ...partial.stats.failed, series: healthyValue().stats.failed.series },
    },
  };
};

export const BothClasses: Story = {
  args: { value: fixtureValue('authFailures', 'es-dev') },
};

export const S3UploadAttempts: Story = {
  args: {
    destinationType: 's3',
    panelRole: 'delivery',
    value: fixtureValue('s3Failures', 's3-test'),
  },
};

export const PartialError: Story = {
  args: { value: fixtureValue('partialFailure', 'es-dev') },
};

/** Parse errors and 429s, for example: failures, and neither authentication nor authorization. */
export const OtherFailuresOnly: Story = {
  args: { value: otherFailuresValue() },
};

export const PartialErrorWithSeries: Story = {
  args: { value: partialErrorWithSeriesValue() },
};

/** The flyout has a chart above, so this panel says that nothing failed. */
export const HealthyFailuresPanel: Story = {
  args: { panelRole: 'failures', value: healthyValue() },
};

/** The panel is the delivery of the flyout, so it shows what was delivered, with a neutral title. */
export const HealthyDeliveryPanel: Story = {
  args: { destinationType: 'remote_elasticsearch', panelRole: 'delivery', value: healthyValue() },
};

/** Nothing was attempted in the range, so there is no failure figure of any kind. */
export const NoAttempts: Story = {
  args: { value: fixtureValue('authFailures', 'es-prod') },
};

export const Loading: Story = {
  args: { value: undefined, loading: true },
};

export const LoadError: Story = {
  args: { value: undefined, error: new Error('Service Unavailable') },
};
