/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Meta, StoryObj } from '@storybook/react';
import { NewChatButton as Component } from './new_chat_button';

const meta: Meta<typeof Component> = {
  component: Component,
  title: 'app/Atoms/NewChatButton',
};

export default meta;

export const NewChatButton: StoryObj<typeof Component> = {
  args: {},
};
