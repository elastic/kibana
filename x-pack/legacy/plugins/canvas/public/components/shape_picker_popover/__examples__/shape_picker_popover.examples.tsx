/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ShapePickerPopover } from '../shape_picker_popover';

import { shapes } from '../../../../canvas_plugin_src/renderers/shape/shapes';

class Interactive extends React.Component<{}, { value: string }> {
  public state = {
    value: 'square',
  };

  public render() {
    return (
      <ShapePickerPopover
        shapes={shapes}
        onChange={value => this.setState({ value })}
        value={this.state.value}
      />
    );
  }
}

storiesOf('components/Shapes/ShapePickerPopover', module)
  .add('default', () => <ShapePickerPopover shapes={shapes} onChange={action('onChange')} />)
  .add('shape selected', () => (
    <ShapePickerPopover shapes={shapes} onChange={action('onChange')} value="square" />
  ))
  .add('interactive', () => <Interactive />, {
    info: {
      source: false,
      propTablesExclude: [Interactive],
    },
  });
