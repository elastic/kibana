/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { niceTimeFormatter } from '@elastic/charts';
import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { ChangePointSummary } from './change_point_summary';

const stories: Meta<{}> = {
  title: 'Streams/ChangePointSummary',
  component: ChangePointSummary,
};

export default stories;

const start = new Date(`2025-03-24T12:00:00.000Z`).getTime();
const end = new Date(`2025-03-24T14:00:00.000Z`).getTime();

const xFormatter = niceTimeFormatter([start, end]);

export const Spike: StoryFn<{}> = () => {
  return (
    <ChangePointSummary
      change={{
        time: new Date(`2025-03-24T13:48:00.000Z`).getTime(),
        label: 'Spike',
        type: 'spike',
        color: 'danger',
        impact: 'high',
        p_value: 0.01,
      }}
      xFormatter={xFormatter}
    />
  );
};
