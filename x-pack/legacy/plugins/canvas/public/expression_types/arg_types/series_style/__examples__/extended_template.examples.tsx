/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { withKnobs, array, radios, boolean } from '@storybook/addon-knobs';
import React from 'react';

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

const defaultValues = {
  argValue: defaultExpression,
};

class Interactive extends React.Component<{}, { argValue: ExpressionAstExpression }> {
  public state = defaultValues;

  public render() {
    const include = [];
    if (boolean('Lines', true)) {
      include.push('lines');
    }
    if (boolean('Bars', true)) {
      include.push('bars');
    }
    if (boolean('Points', true)) {
      include.push('points');
    }
    return (
      <ExtendedTemplate
        argValue={this.state.argValue}
        onValueChange={(argValue) => {
          action('onValueChange')(argValue);
          this.setState({ argValue });
        }}
        labels={array('Series Labels', ['label1', 'label2'])}
        typeInstance={{
          name: radios('Type Instance', { default: 'defaultStyle', custom: 'custom' }, 'custom'),
          options: {
            include,
          },
        }}
      />
    );
  }
}

storiesOf('arguments/SeriesStyle', module)
  .addDecorator((story) => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .addDecorator(withKnobs)
  .add('extended', () => <Interactive />);

storiesOf('arguments/SeriesStyle/components', module)
  .addDecorator((story) => (
    <div style={{ width: '323px', padding: '16px', background: '#fff' }}>{story()}</div>
  ))
  .add('extended: defaults', () => (
    <ExtendedTemplate
      argValue={defaultExpression}
      labels={[]}
      onValueChange={action('onValueChange')}
      typeInstance={{
        name: 'defaultStyle',
        options: {
          include: [],
        },
      }}
    />
  ));
