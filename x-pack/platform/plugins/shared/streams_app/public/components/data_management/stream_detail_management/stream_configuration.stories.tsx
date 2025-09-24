/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { StreamSystemConfiguration } from './stream_system_configuration';

const stories: Meta<{}> = {
  title: 'Streams/StreamSystemConfiguration',
  component: StreamSystemConfiguration,
};

export default stories;

export const StreamConfigurationStory: StoryFn<{}> = () => {
  return (
    <StreamSystemConfiguration
      definition={{
        name: 'synthetics-http-default',
        description: '',
        ingest: {
          settings: {},
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          classic: {},
        },
      }}
    />
  );
};
