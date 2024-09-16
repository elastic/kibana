/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { NodeButton, NodeContainer } from './node';

export default {
  title: 'Components/Graph Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    onClick: { action: 'onClick' },
  },
};

const Template = (args) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <NodeContainer>
      Hover me
      <NodeButton onClick={args.onClick} />
    </NodeContainer>
  </ThemeProvider>
);

export const Button = Template.bind({});
