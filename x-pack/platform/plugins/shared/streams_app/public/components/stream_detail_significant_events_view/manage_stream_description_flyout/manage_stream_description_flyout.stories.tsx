/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { ManageStreamDescriptionFlyout } from './manage_stream_description_flyout';

const stories: Meta<{}> = {
  title: 'Streams/ManageStreamDescriptionFlyout',
  component: ManageStreamDescriptionFlyout,
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
    lifecycle: {
      inherit: {},
    },
    processing: [],
  },
};

export const Default: StoryFn<{}> = () => {
  return (
    <ManageStreamDescriptionFlyout
      definition={logsStreamDefinition}
      onClose={() => {}}
      onSave={async () => {}}
    />
  );
};

export const WithExisting: StoryFn<{}> = () => {
  const definition = {
    ...logsStreamDefinition,
    description: 'This is a SpringBoot application running Java 91',
  };
  return (
    <ManageStreamDescriptionFlyout
      definition={definition}
      onClose={() => {}}
      onSave={async () => {}}
    />
  );
};
