/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { Timeline } from '.';

const stories: Meta<{}> = {
  title: 'Streams/Timeline',
  component: Timeline,
};

export default stories;

const start = new Date(`2025-03-24T12:00:00.000Z`).getTime();
const end = new Date(`2025-03-24T14:00:00.000Z`).getTime();

export const Empty: StoryFn<{}> = () => {
  return (
    <EuiPanel
      className={css`
        width: 864px;
      `}
      hasBorder={false}
      hasShadow={false}
    >
      <Timeline events={[]} start={start} end={end} />
    </EuiPanel>
  );
};

export const WithEvents: StoryFn<{}> = () => {
  const theme = useEuiTheme();

  const events = [
    {
      id: 'some_event',
      time: new Date(`2025-03-24T12:30:00.000Z`).getTime(),
      label: `Some event`,
      color: theme.euiTheme.colors.danger,
    },
    {
      id: 'some_other_event',
      time: new Date(`2025-03-24T12:31:00.000Z`).getTime(),
      label: `Some other event`,
      color: theme.euiTheme.colors.danger,
    },
    {
      id: 'another_event',
      time: new Date(`2025-03-24T13:48.000Z`).getTime(),
      label: `Another event`,
      color: theme.euiTheme.colors.danger,
    },
  ];
  return (
    <EuiPanel
      className={css`
        width: 864px;
      `}
      hasBorder={false}
      hasShadow={false}
    >
      <Timeline events={events} start={start} end={end} />
    </EuiPanel>
  );
};
