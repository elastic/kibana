/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import type { Meta } from '@storybook/react';
import { ExpressionAstExpression } from '../../../../../types';

import { ExtendedTemplate } from '../extended_template';

const defaultExpression: ExpressionAstExpression = {
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'axisConfig',
      arguments: {},
    },
  ],
};

const defaultValues = {
  argValue: defaultExpression,
};

class Interactive extends React.Component<{}, typeof defaultValues> {
  public state = defaultValues;

  _onValueChange: (argValue: ExpressionAstExpression) => void = (argValue) => {
    action('onValueChange')(argValue);
    this.setState({ argValue });
  };

  public render() {
    return (
      <ExtendedTemplate
        onValueChange={this._onValueChange}
        argValue={this.state.argValue}
        typeInstance={{ name: 'xaxis' }}
      />
    );
  }
}

export default {
  title: 'arguments/AxisConfig',

  decorators: [
    (story) => <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>,
  ],
} as Meta;

export const Extended = {
  render: () => <Interactive />,
  name: 'extended',
};

export const ExtendedDisabled = {
  render: () => (
    <ExtendedTemplate
      onValueChange={action('onValueChange')}
      argValue={false}
      typeInstance={{ name: 'yaxis' }}
    />
  ),

  name: 'extended disabled',
};

export const _Extended = {
  render: () => (
    <ExtendedTemplate
      onValueChange={action('onValueChange')}
      argValue={defaultExpression}
      typeInstance={{ name: 'yaxis' }}
    />
  ),

  name: 'extended',
};
