/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { AddSignificantEventFlyout } from './add_significant_event_flyout';

const stories: Meta<{}> = {
  title: 'Streams/AddSignificantEventFlyout',
  component: AddSignificantEventFlyout,
};

export default stories;

const logsStreamDefinition: Streams.WiredStream.Definition = {
  name: 'logs',
  description: '',
  ingest: {
    wired: {
      fields: {},
      routing: [],
    },
    lifecycle: { inherit: {} },
    processing: { steps: [] },
    settings: {},
  },
};

export const Default: StoryFn<{}> = () => {
  return (
    <AddSignificantEventFlyout
      definition={logsStreamDefinition}
      onClose={() => {}}
      onSave={async (queries) => {}}
      systems={[
        {
          name: 'Test system',
          filter: {
            field: 'host.name',
            eq: 'test.host',
          },
          description: '',
        },
      ]}
    />
  );
};

export const Edit: StoryFn<{}> = () => {
  return (
    <AddSignificantEventFlyout
      definition={logsStreamDefinition}
      onClose={() => {}}
      onSave={async (queries) => {}}
      systems={[
        {
          name: 'Test system',
          filter: {
            field: 'host.name',
            eq: 'test.host',
          },
          description: '',
        },
      ]}
      query={{
        id: '123',
        title: 'Operational Event: Service Lifecycle - LockScreenActivity',
        kql: {
          query: 'message:"cmp=com.tencent.qqmusic/.business.lockscreen.LockScreenActivity"',
        },
        system: {
          name: 'Test system',
          filter: {
            field: 'host.name',
            eq: 'test.host',
          },
        },
      }}
    />
  );
};
