/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Preview } from '@storybook/react';
import { Title, Subtitle, Description, Primary, Stories } from '@storybook/blocks';

import { decorator } from './decorator';

const preview: Preview = {
  decorators: [decorator],
  parameters: {
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Description />
          <Primary />
          <Stories />
        </>
      ),
    },
  },
};

// eslint-disable-next-line import/no-default-export
export default preview;
