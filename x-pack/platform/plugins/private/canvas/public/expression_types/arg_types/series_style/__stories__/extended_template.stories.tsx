/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { ExtendedTemplate } from '../extended_template';
import { ExpressionAstExpression } from '../../../../../types';

const defaultExpression: ExpressionAstExpression = {
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'seriesStyle',
      arguments: {},
    },
  ],
};

interface StoryProps {
  showLines: boolean;
  showBars: boolean;
  showPoints: boolean;
  seriesLabels: string[];
  typeInstanceName: 'defaultStyle' | 'custom';
}

const meta: Meta<StoryProps> = {
  title: 'arguments/SeriesStyle',
  decorators: [
    (Story) => (
      <div style={{ width: '323px', padding: '16px', background: '#fff' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<StoryProps>;

const Component = (args: StoryProps) => {
  const [argValue, setArgValue] = useState<ExpressionAstExpression>(defaultExpression);
  const { showLines, showBars, showPoints, seriesLabels, typeInstanceName } = args;

  const include = [];
  if (showLines) {
    include.push('lines');
  }
  if (showBars) {
    include.push('bars');
  }
  if (showPoints) {
    include.push('points');
  }

  return (
    <ExtendedTemplate
      argValue={argValue}
      onValueChange={(newArgValue) => {
        action('onValueChange')(newArgValue);
        setArgValue(newArgValue);
      }}
      resolved={{ labels: seriesLabels }}
      typeInstance={{
        name: typeInstanceName,
        options: {
          include,
        },
      }}
    />
  );
};

// Interactive story with controls
export const Extended: Story = {
  args: {
    showLines: true,
    showBars: true,
    showPoints: true,
    seriesLabels: ['label1', 'label2'],
    typeInstanceName: 'custom',
  },
  render: Component,
};

// Components story with defaults
export const ComponentsExtendedDefaults: StoryObj = {
  name: 'extended: defaults',
  render: () => (
    <ExtendedTemplate
      argValue={defaultExpression}
      resolved={{ labels: [] }}
      onValueChange={action('onValueChange')}
      typeInstance={{
        name: 'defaultStyle',
        options: {
          include: [],
        },
      }}
    />
  ),
};
