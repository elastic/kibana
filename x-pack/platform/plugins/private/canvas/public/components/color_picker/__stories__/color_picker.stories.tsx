/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { ColorPicker } from '../color_picker';

const THREE_COLORS = ['#fff', '#666', '#000'];
const SIX_COLORS = ['#fff', '#666', '#000', '#abc', '#def', '#abcdef'];

interface ColorPickerProps {
  value?: string;
  colors: string[];
  hasButtons?: boolean;
  onChange?: (value: string) => void;
  onAddColor?: (value: string) => void;
  onRemoveColor?: (value: string) => void;
}

const meta: Meta<ColorPickerProps> = {
  title: 'components/Color/ColorPicker',
  component: ColorPicker,
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

export default meta;
type Story = StoryObj<ColorPickerProps>;

export const ThreeColors: Story = {
  name: 'three colors',
  args: {
    value: '#fff',
    colors: THREE_COLORS,
    hasButtons: true,
  },
  render: (args) => (
    <ColorPicker
      {...args}
      onChange={action('onChange')}
      onAddColor={action('onAddColor')}
      onRemoveColor={action('onRemoveColor')}
    />
  ),
};

export const SixColors: Story = {
  name: 'six colors',
  args: {
    value: '#fff',
    colors: SIX_COLORS,
    hasButtons: true,
  },
  render: (args) => (
    <ColorPicker
      {...args}
      onChange={action('onChange')}
      onAddColor={action('onAddColor')}
      onRemoveColor={action('onRemoveColor')}
    />
  ),
};

export const SixColorsMissingValue: Story = {
  name: 'six colors, value missing',
  args: {
    value: '#a1b2c3',
    colors: SIX_COLORS,
    hasButtons: true,
  },
  render: (args) => (
    <ColorPicker
      {...args}
      onChange={action('onChange')}
      onAddColor={action('onAddColor')}
      onRemoveColor={action('onRemoveColor')}
    />
  ),
};

const InteractiveComponent = () => {
  const [value, setValue] = useState<string>('');
  const [colors, setColors] = useState<string[]>(SIX_COLORS);
  const [hasButtons, setHasButtons] = useState<boolean>(true);

  return (
    <div>
      <ColorPicker
        colors={colors}
        onAddColor={(newColor) => setColors([...colors, newColor])}
        onRemoveColor={(colorToRemove) =>
          setColors(colors.filter((color) => color !== colorToRemove))
        }
        onChange={(newValue) => setValue(newValue)}
        hasButtons={hasButtons}
        value={value}
      />
      <p style={{ marginTop: 20 }}>
        <label>
          <input
            aria-checked={hasButtons}
            type="checkbox"
            checked={hasButtons}
            onChange={() => setHasButtons(!hasButtons)}
          />
          {'  '}
          <span>Show Buttons?</span>
        </label>
      </p>
    </div>
  );
};

export const Interactive: Story = {
  name: 'interactive',
  parameters: {
    info: {
      inline: true,
      source: false,
      propTablesExclude: [InteractiveComponent],
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
  render: InteractiveComponent,
};
