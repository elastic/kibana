/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { ColorPalette } from '../color_palette';

const THREE_COLORS = ['#fff', '#666', '#000'];
const SIX_COLORS = ['#fff', '#666', '#000', '#abc', '#def', '#abcdef'];

class Interactive extends React.Component<{}, { value: string }> {
  public state = {
    value: '',
  };

  public render() {
    return (
      <ColorPalette
        colors={SIX_COLORS}
        onChange={(value) => this.setState({ value })}
        value={this.state.value}
      />
    );
  }
}

export default {
  title: 'components/Color/ColorPalette',
};

export const ThreeColors = {
  render: () => (
    <>
      <ColorPalette key="1" onChange={action('onChange')} colors={THREE_COLORS} />
      <ColorPalette key="2" value="#fff" onChange={action('onChange')} colors={THREE_COLORS} />
    </>
  ),

  name: 'three colors',
};

export const SixColors = {
  render: () => (
    <>
      <ColorPalette key="1" onChange={action('onChange')} colors={SIX_COLORS} />
      <ColorPalette key="2" value="#fff" onChange={action('onChange')} colors={SIX_COLORS} />
    </>
  ),

  name: 'six colors',
};

export const SixColorsWrapAt4 = {
  render: () => (
    <ColorPalette value="#fff" onChange={action('onChange')} colors={SIX_COLORS} colorsPerRow={4} />
  ),

  name: 'six colors, wrap at 4',
};

export const SixColorsValueMissing = {
  render: () => <ColorPalette value="#f00" onChange={action('onChange')} colors={SIX_COLORS} />,

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
        },
      },
    },
  },
};
