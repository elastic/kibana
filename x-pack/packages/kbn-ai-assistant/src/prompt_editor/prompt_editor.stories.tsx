/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory, ComponentStoryObj } from '@storybook/react';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import { KibanaReactStorybookDecorator } from '../utils/storybook_decorator.stories';
import { PromptEditor as Component, PromptEditorProps } from './prompt_editor';

/*
  JSON Schema validation in the PromptEditor compponent does not work
  when rendering the component from within Storybook.

*/
export default {
  component: Component,
  title: 'app/Molecules/PromptEditor',
  argTypes: {},
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: PromptEditorProps) => {
  return <Component {...props} />;
};

export const PromptEditorDisabled: ComponentStoryObj<typeof Component> = {
  args: {
    disabled: true,
    hidden: false,
    loading: false,
    initialRole: MessageRole.User,
    initialFunctionCall: undefined,
    initialContent: '',
    onChangeHeight: () => {},
    onSendTelemetry: () => {},
    onSubmit: () => {},
  },
  render: Template,
};

export const PromptEditorLoading: ComponentStoryObj<typeof Component> = {
  args: {
    disabled: false,
    hidden: false,
    loading: true,
    initialRole: MessageRole.User,
    initialFunctionCall: undefined,
    initialContent: '',
    onChangeHeight: () => {},
    onSendTelemetry: () => {},
    onSubmit: () => {},
  },
  render: Template,
};

export const PromptEditorWithInitialContent: ComponentStoryObj<typeof Component> = {
  args: {
    disabled: false,
    hidden: false,
    loading: true,
    initialRole: MessageRole.User,
    initialFunctionCall: undefined,
    initialContent: 'Can you help me with this?',
    onChangeHeight: () => {},
    onSendTelemetry: () => {},
    onSubmit: () => {},
  },
  render: Template,
};

export const PromptEditorWithInitialFunction: ComponentStoryObj<typeof Component> = {
  args: {
    disabled: false,
    hidden: false,
    loading: false,
    initialRole: MessageRole.User,
    initialFunctionCall: {
      name: 'get stuff',
      trigger: MessageRole.User,
    },
    initialContent: '',
    onChangeHeight: () => {},
    onSendTelemetry: () => {},
    onSubmit: () => {},
  },
  render: Template,
};
