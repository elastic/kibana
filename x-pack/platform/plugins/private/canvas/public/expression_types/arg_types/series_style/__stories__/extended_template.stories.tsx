/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { Meta } from '@storybook/react';
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

interface InteractiveProps {
  lines?: boolean;
  bars?: boolean;
  points?: boolean;
  seriesLabels: string[];
  typeInstance: 'defaultStyle' | 'custom';
}

const Interactive = ({
  lines = true,
  bars = true,
  points = true,
  seriesLabels = ['label1', 'label2'],
  typeInstance = 'custom',
}: InteractiveProps) => {
  const [argValue, setArgValue] = useState<ExpressionAstExpression>(defaultExpression);

  const include = [];
  if (lines) include.push('lines');
  if (bars) include.push('bars');
  if (points) include.push('points');

  return (
    <ExtendedTemplate
      argValue={argValue}
      onValueChange={(newValue) => {
        action('onValueChange')(newValue);
        setArgValue(newValue);
      }}
      resolved={{ labels: seriesLabels }}
      typeInstance={{
        name: typeInstance,
        options: { include },
      }}
    />
  );
};

export default {
  title: 'arguments/SeriesStyle',
  component: Interactive,
  decorators: [
    (story) => <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>,
  ],
  args: {
    lines: true,
    bars: true,
    points: true,
    seriesLabels: ['label1', 'label2'],
    typeInstance: 'custom',
  },
  argTypes: {
    typeInstance: {
      control: 'radio',
      options: ['defaultStyle', 'custom'],
    },
    seriesLabels: {
      control: 'object',
    },
  },
} as Meta<InteractiveProps>;

export const ExtendedDefaults = {
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

  name: 'extended: defaults',
};
