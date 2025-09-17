/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import type { System } from '@kbn/streams-schema';
import { faker } from '@faker-js/faker';
import { StreamSystemsFlyout } from './stream_systems_flyout';

const stories: Meta<{}> = {
  title: 'Streams/StreamSystemFlyout',
  component: StreamSystemsFlyout,
};

const systems: System[] = [];

for (let i = 0; i < 5; i++) {
  systems.push({
    name: faker.company.name(),
    description: faker.lorem.sentence(),
    filter: {
      field: faker.database.column(),
    },
  });
}

export default stories;

export const Spike: StoryFn<{}> = () => {
  return <StreamSystemsFlyout systems={systems} closeFlyout={() => {}} />;
};
