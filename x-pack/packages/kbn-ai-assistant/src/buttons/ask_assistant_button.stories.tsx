/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StoryFn } from '@storybook/react';
import { EuiButtonSize } from '@elastic/eui';

import { AskAssistantButton as Component, AskAssistantButtonProps } from './ask_assistant_button';

export default {
  component: Component,
  title: 'app/Atoms/AskAiAssistantButton',
  argTypes: {
    size: {
      options: ['xs', 's', 'm'] as EuiButtonSize[],
      control: { type: 'radio' },
    },
    fill: {
      control: {
        type: 'boolean',
      },
    },
    flush: {
      control: {
        type: 'boolean',
        if: { arg: 'variant', eq: 'empty' },
      },
    },
    variant: {
      options: ['basic', 'empty', 'iconOnly'],
      control: { type: 'radio' },
    },
  },
};

const defaultProps = {
  fill: true,
  size: 'm' as EuiButtonSize,
  variant: 'basic' as const,
};

export const AskAiAssistantButton = {
  args: defaultProps,
};
