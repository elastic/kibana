/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
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

  _onValueChange: (argValue: ExpressionAstExpression) => void = argValue => {
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

storiesOf('arguments/AxisConfig', module)
  .addDecorator(story => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('extended', () => <Interactive />);

storiesOf('arguments/AxisConfig/components', module)
  .addDecorator(story => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('extended disabled', () => (
    <ExtendedTemplate
      onValueChange={action('onValueChange')}
      argValue={false}
      typeInstance={{ name: 'yaxis' }}
    />
  ))
  .add('extended', () => (
    <ExtendedTemplate
      onValueChange={action('onValueChange')}
      argValue={defaultExpression}
      typeInstance={{ name: 'yaxis' }}
    />
  ));
