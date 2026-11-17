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
import { DestinationFailuresView } from './destination_failures_section';

const meta: Meta<typeof DestinationFailuresView> = {
  component: DestinationFailuresView,
  title: 'streams/destinations/DestinationFailuresView',
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
  args: { destinationType: 'elasticsearch', loading: false, showTimePicker: false },
};

export default meta;
type Story = StoryObj<typeof DestinationFailuresView>;

const fixtureValue = (scenario: StatsFixtureScenario, destinationId: string) =>
  mapStatsResponse(STATS_FIXTURE_RESPONSES[scenario], [{ kind: 'destination', id: destinationId }])
    .destinations[destinationId];

export const BothClasses: Story = {
  args: { value: fixtureValue('authFailures', 'es-dev') },
};

export const S3UploadAttempts: Story = {
  args: { destinationType: 's3', value: fixtureValue('s3Failures', 's3-test') },
};

export const PartialError: Story = {
  args: { value: fixtureValue('partialFailure', 'es-dev') },
};

export const NoFailures: Story = {
  args: { value: fixtureValue('authFailures', 'es-prod') },
};

export const Loading: Story = {
  args: { value: undefined, loading: true },
};

export const LoadError: Story = {
  args: { value: undefined, error: new Error('Service Unavailable') },
};
