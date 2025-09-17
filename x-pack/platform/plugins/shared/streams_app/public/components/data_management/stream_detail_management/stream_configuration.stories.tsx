/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { StreamConfiguration } from './stream_configuration';

const stories: Meta<{}> = {
  title: 'Streams/StreamConfiguration',
  component: StreamConfiguration,
};

export default stories;

export const Spike: StoryFn<{}> = () => {
  return (
    <StreamConfiguration
      definition={
        {
          stream: {
            name: 'synthetics-http-default',
            description: '',
            ingest: {
              settings: {},
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              classic: {},
            },
          },
          privileges: {
            manage: true,
            monitor: true,
            lifecycle: true,
            simulate: true,
            text_structure: true,
          },
          elasticsearch_assets: {
            ingestPipeline: 'synthetics-http-1.4.2',
            componentTemplates: [
              'synthetics-http@package',
              'synthetics@custom',
              'synthetics-http@custom',
              'ecs@mappings',
              '.fleet_globals-1',
              '.fleet_agent_id_verification-1',
            ],
            indexTemplate: 'synthetics-http',
            dataStream: 'synthetics-http-default',
          },
          data_stream_exists: true,
          effective_lifecycle: { ilm: { policy: 'synthetics-synthetics.http-default_policy' } },
          dashboards: [],
          rules: [],
          queries: [],
          effective_settings: [],
        } as Streams.ClassicStream.GetResponse
      }
    />
  );
};
