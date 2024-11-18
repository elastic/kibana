/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from '@emotion/react';
import { Story } from '@storybook/react';
import { NodeButton, type NodeButtonProps, NodeShapeContainer } from './styles';

export default {
  title: 'Components/Graph Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    onClick: { action: 'onClick' },
  },
};

const Template: Story<NodeButtonProps> = (args) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <NodeShapeContainer>
      Hover me
      <NodeButton onClick={args.onClick} />
    </NodeShapeContainer>
  </ThemeProvider>
);

export const Button = Template.bind({});
