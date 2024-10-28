/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { buildConversation } from '../utils/builders';
import { KibanaReactStorybookDecorator } from '../utils/storybook_decorator.stories';
import { ConversationList as Component } from './conversation_list';

type ConversationListProps = React.ComponentProps<typeof Component>;

const meta: Meta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/ConversationList',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const Wrapper = (props: ConversationListProps) => {
  return (
    <div style={{ minHeight: 800, maxWidth: 240, display: 'flex' }}>
      <Component {...props} />
    </div>
  );
};

export const ConversationListLoading: StoryObj<typeof Component> = {
  args: {
    conversations: {
      loading: true,
      error: undefined,
      value: { conversations: [] },
      refresh: () => {},
    },
    isLoading: true,
  },
  render: Wrapper,
};

export const ConversationListError: StoryObj<typeof Component> = {
  args: {
    conversations: {
      loading: false,
      error: new Error('Failed to load conversations'),
      value: { conversations: [] },
      refresh: () => {},
    },
    isLoading: false,
  },
  render: Wrapper,
};

export const ConversationListLoaded: StoryObj<typeof Component> = {
  args: {
    conversations: {
      loading: false,
      error: undefined,
      value: {
        conversations: [
          buildConversation({
            conversation: {
              id: 'foo',
              title: 'Why is database service responding with errors after I did rm -rf /postgres',
              last_updated: '',
            },
          }),
        ],
      },
      refresh: () => {},
    },
    selectedConversationId: '',
  },
  render: Wrapper,
};

export const ConversationListEmpty: StoryObj<typeof Component> = {
  args: {
    conversations: {
      loading: false,
      error: undefined,
      value: { conversations: [] },
      refresh: () => {},
    },
    isLoading: false,
    selectedConversationId: '',
  },
  render: Wrapper,
};
