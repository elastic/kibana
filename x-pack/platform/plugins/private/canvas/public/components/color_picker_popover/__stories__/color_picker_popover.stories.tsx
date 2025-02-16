/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ColorPickerPopover } from '../color_picker_popover';

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
        <ColorPickerPopover
          colors={this.state.colors}
          onChange={(value) => this.setState({ value })}
          onAddColor={action('onAddColor')}
          onRemoveColor={action('onRemoveColor')}
          value={this.state.value}
          anchorPosition="downCenter"
          hasButtons={this.state.hasButtons}
          ariaLabel="Color Picker"
        />
        <p style={{ marginTop: 20 }}>
          <label>
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

export default {
  title: 'components/Color/ColorPickerPopover',

  parameters: {
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
  },
};

export const ThreeColors = {
  render: () => (
    <ColorPickerPopover
      value="#fff"
      anchorPosition="downCenter"
      onChange={action('onChange')}
      colors={THREE_COLORS}
      ariaLabel="Color Picker"
    />
  ),

  name: 'three colors',
};

export const SixColors = {
  render: () => (
    <ColorPickerPopover
      value="#fff"
      anchorPosition="downCenter"
      onChange={action('onChange')}
      colors={SIX_COLORS}
      ariaLabel="Color Picker"
    />
  ),

  name: 'six colors',
};

export const SixColorsValueMissing = {
  render: () => (
    <ColorPickerPopover
      value="#a1b2c3"
      anchorPosition="downCenter"
      onChange={action('onChange')}
      colors={SIX_COLORS}
      ariaLabel="Color Picker"
    />
  ),

  name: 'six colors, value missing',
};

export const _Interactive = {
  render: () => <Interactive />,
  name: 'interactive',

  parameters: {
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
  },
};
