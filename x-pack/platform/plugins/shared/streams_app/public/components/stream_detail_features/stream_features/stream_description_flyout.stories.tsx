/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import type { Feature } from '@kbn/streams-schema';
import { faker } from '@faker-js/faker';
import { StreamFeaturesFlyout } from './stream_features_flyout';

const stories: Meta<{}> = {
  title: 'Streams/StreamFeatureFlyout',
  component: StreamFeaturesFlyout,
};

const features: Feature[] = [];

for (let i = 0; i < 5; i++) {
  features.push({
    type: 'system',
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    filter: {
      field: faker.database.column(),
    },
  });
}

export default stories;

export const StreamFeatureFlyoutStory: StoryFn<{}> = () => {
  features[0].description = `## Hello world!

Basic "GitHub flavored" markdown will work as you'd expect.

The editor also ships with some built in plugins. For example it can handle checkboxes. Notice how they toggle state even in the preview mode.

- [ ] Checkboxes
- [x] Can be filled
- [ ] Or empty

It can also handle emojis! :smile:
And it can render !{tooltip[tooltips like this](Look! I'm a very helpful tooltip content!)}
`;
  return (
    <StreamFeaturesFlyout
      features={features}
      closeFlyout={() => {}}
      isLoading={false}
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
      setFeatures={() => {}}
    />
  );
};
