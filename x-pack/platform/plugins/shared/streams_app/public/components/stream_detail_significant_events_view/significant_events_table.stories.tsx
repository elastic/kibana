/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { niceTimeFormatter } from '@elastic/charts';
import type { Streams } from '@kbn/streams-schema';
import { SignificantEventsTable } from './significant_events_table';

const stories: Meta<{}> = {
  title: 'Streams/SignificantEventsTable',
  component: SignificantEventsTable,
};

export default stories;

const start = new Date(`2025-03-24T12:00:00.000Z`).getTime();
const end = new Date(`2025-03-24T14:00:00.000Z`).getTime();

function generateValues() {
  return new Array(25).fill(undefined).map((_, index) => {
    return {
      x: start + index * 60 * 1000,
      y: 100 + (12 - Math.abs(index - 12)) * 10,
    };
  });
}

const xFormatter = niceTimeFormatter([start, end]);

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

export const Empty: StoryFn<{}> = () => {
  return (
    <SignificantEventsTable definition={logsStreamDefinition} items={[]} xFormatter={xFormatter} />
  );
};

export const SomeThings: StoryFn<{}> = () => {
  return (
    <SignificantEventsTable
      definition={logsStreamDefinition}
      onDeleteClick={() => {
        return new Promise<void>((resolve) =>
          setTimeout(() => {
            resolve();
          }, 1000)
        );
      }}
      items={[
        {
          title: 'High error rate',
          query: {
            id: 'match_everything',
            title: 'Match everything',
            kql: {
              query: '*',
            },
            system: {
              name: 'System',
              filter: {
                always: {},
              },
            },
          },
          change_points: {
            type: {
              spike: {
                change_point: 3,
                p_value: 0.0001,
              },
            },
          },
          occurrences: generateValues(),
        },
      ]}
      xFormatter={xFormatter}
    />
  );
};
