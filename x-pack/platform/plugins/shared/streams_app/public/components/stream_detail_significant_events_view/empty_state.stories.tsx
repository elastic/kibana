/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import classNames from 'classnames';
import { SignificantEventsViewEmptyState } from './empty_state';

const stories: Meta<{}> = {
  title: 'Streams/SignificantEventsViewEmptyState',
  component: SignificantEventsViewEmptyState,
};

export default stories;

export const Create: StoryFn<{}> = () => {
  return (
    <EuiPanel
      className={classNames(
        'euiFlyout',
        css`
          width: 480px;
        `
      )}
    >
      <SignificantEventsViewEmptyState />
    </EuiPanel>
  );
};
