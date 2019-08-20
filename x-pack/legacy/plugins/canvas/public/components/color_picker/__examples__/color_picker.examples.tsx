/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { boolean, withKnobs } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { ColorPicker } from '../color_picker';

const THREE_COLORS = ['#fff', '#666', '#000'];
const SIX_COLORS = ['#fff', '#666', '#000', '#abc', '#def', '#abcdef'];

class Interactive extends React.Component<
  {},
  { hasButtons: boolean; value: string; colors: string[] }
> {
  public state = {
    value: '',
    colors: SIX_COLORS,
    hasButtons: true,
  };

  public render() {
    return (
      <div>
        <ColorPicker
          colors={this.state.colors}
          onAddColor={value => this.setState({ colors: this.state.colors.concat(value) })}
          onRemoveColor={value =>
            this.setState({ colors: this.state.colors.filter(color => color !== value) })
          }
          onChange={value => this.setState({ value })}
          hasButtons={this.state.hasButtons}
          value={this.state.value}
        />
        <p style={{ marginTop: 20 }}>
          <label>
            {/* eslint-disable-next-line react-a11y-input-elements */}
            <input
              aria-checked={this.state.hasButtons}
              type="checkbox"
              checked={this.state.hasButtons}
              onChange={() => this.setState({ hasButtons: !this.state.hasButtons })}
            />
            {'  '}
            <span>Show Buttons?</span>
          </label>
        </p>
      </div>
    );
  }
}

storiesOf('components/Color/ColorPicker', module)
  .addDecorator(withKnobs)
  .addParameters({
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  })
  .add('three colors', () => (
    <ColorPicker
      value="#fff"
      onAddColor={action('onAddColor')}
      onRemoveColor={action('onRemoveColor')}
      onChange={action('onChange')}
      colors={THREE_COLORS}
      hasButtons={boolean('Has Buttons', true)}
    />
  ))
  .add('six colors', () => (
    <ColorPicker
      value="#fff"
      onAddColor={action('onAddColor')}
      onRemoveColor={action('onRemoveColor')}
      onChange={action('onChange')}
      colors={SIX_COLORS}
      hasButtons={boolean('Has Buttons', true)}
    />
  ))
  .add('six colors, value missing', () => (
    <ColorPicker
      value="#a1b2c3"
      onAddColor={action('onAddColor')}
      onRemoveColor={action('onRemoveColor')}
      onChange={action('onChange')}
      colors={SIX_COLORS}
      hasButtons={boolean('Has Buttons', true)}
    />
  ))
  .add('interactive', () => <Interactive />, {
    info: {
      inline: true,
      source: false,
      propTablesExclude: [Interactive],
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  });
