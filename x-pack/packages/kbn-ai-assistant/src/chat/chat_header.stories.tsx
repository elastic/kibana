/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { EuiPanel } from '@elastic/eui';
import { ChatHeader as Component } from './chat_header';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/ChatHeader',
};

export default meta;

export const ChatHeaderLoaded: ComponentStoryObj<typeof Component> = {
  args: {
    title: 'My conversation',
    connectors: {
      loading: false,
      selectedConnector: 'gpt-4',
      connectors: [
        { id: 'gpt-4', name: 'OpenAI GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'OpenAI GPT-3.5 Turbo' },
      ] as FindActionResult[],
      selectConnector: () => {},
      reloadConnectors: () => {},
    },
  },
  render: (props) => {
    return (
      <EuiPanel hasBorder hasShadow={false}>
        <Component {...props} />
      </EuiPanel>
    );
  },
};
