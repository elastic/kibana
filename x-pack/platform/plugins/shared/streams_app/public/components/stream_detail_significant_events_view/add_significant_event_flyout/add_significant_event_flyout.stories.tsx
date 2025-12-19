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

const logsStreamDefinition: Streams.WiredStream.GetResponse = {
  stream: {
    name: 'logs',
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      wired: {
        fields: {},
        routing: [],
      },
      lifecycle: { inherit: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      failure_store: { inherit: {} },
    },
  },
  dashboards: [],
  rules: [],
  queries: [],
  inherited_fields: {},
  effective_failure_store: { disabled: {}, from: 'logs' },
  effective_lifecycle: { dsl: {}, from: 'logs' },
  effective_settings: {},
  privileges: {
    manage: true,
    monitor: true,
    view_index_metadata: true,
    lifecycle: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
  },
};

export const Default: StoryFn<{}> = () => {
  return (
    <AddSignificantEventFlyout
      generateOnMount={false}
      onFeatureIdentificationClick={() => {}}
      definition={logsStreamDefinition}
      initialSelectedFeatures={[]}
      onClose={() => {}}
      onSave={async (queries) => {}}
      refreshDefinition={() => {}}
      aiFeatures={null}
      features={[
        {
          type: 'system',
          name: 'Test feature',
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
      generateOnMount={false}
      refreshDefinition={() => {}}
      onFeatureIdentificationClick={() => {}}
      initialSelectedFeatures={[]}
      definition={logsStreamDefinition}
      onClose={() => {}}
      onSave={async (queries) => {}}
      aiFeatures={null}
      features={[
        {
          type: 'system',
          name: 'Test feature',
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
        feature: {
          name: 'Test feature',
          type: 'system',
          filter: {
            field: 'host.name',
            eq: 'test.host',
          },
        },
      }}
    />
  );
};
