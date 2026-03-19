/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AiButton, type AiButtonProps } from '@kbn/shared-ux-ai-components';

interface CommonStoryArgs {
  label: string;
  isDisabled: boolean;
  icon: 'sparkles';
  size: AiButtonProps['size'];
}

interface StoryArgs extends CommonStoryArgs {
  iconOnly: boolean;
  variant: Exclude<AiButtonProps['variant'], 'outlined'>;
}

export default {
  title: 'AI components/AskAssistantButton',
  description: 'A button component for the Ask AI Assistant.',
  argTypes: {
    label: { control: 'text' },
    variant: { control: 'select', options: ['base', 'accent', 'empty'] },
    size: { control: 'select', options: ['xs', 's', 'm'] },
    isDisabled: { control: 'boolean' },
    iconOnly: { control: 'boolean' },
  },
} as Meta<StoryArgs>;

export const Default: StoryObj<StoryArgs> = {
  render: ({ label, variant, size, isDisabled, iconOnly, icon }) => {
    if (iconOnly) {
      return (
        <AiButton
          iconOnly
          variant={variant}
          size={size}
          isDisabled={isDisabled}
          iconType={icon}
          aria-label={label}
        />
      );
    }

    if (variant === 'empty') {
      return (
        <AiButton variant={variant} size={size} isDisabled={isDisabled} iconType={icon}>
          {label}
        </AiButton>
      );
    }

    return (
      <AiButton variant={variant} size={size} isDisabled={isDisabled} iconType={icon}>
        {label}
      </AiButton>
    );
  },
  args: {
    label: 'Ask AI Assistant',
    variant: 'base',
    size: 's',
    isDisabled: false,
    iconOnly: false,
    icon: 'sparkles',
  },
};
