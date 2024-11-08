/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import { merge } from 'lodash';
import { KibanaReactStorybookDecorator } from '../utils/storybook_decorator.stories';
import { KnowledgeBaseCallout as Component } from './knowledge_base_callout';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/KnowledgeBaseCallout',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;
const defaultProps: ComponentStoryObj<typeof Component> = {
  args: {
    knowledgeBase: {
      status: {
        loading: false,
        value: {
          ready: false,
          enabled: true,
        },
        refresh: () => {},
      },
      isInstalling: false,
      installError: undefined,
      install: async () => {},
    },
  },
};

export const StatusError: ComponentStoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: false, error: new Error() } } },
});

export const Loading: ComponentStoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: true } } },
});

export const NotInstalled: ComponentStoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: false, value: { ready: false, enabled: true } } } },
});

export const Installing: ComponentStoryObj<typeof Component> = merge({}, defaultProps, {
  args: {
    knowledgeBase: {
      status: { loading: false, value: { ready: false, enabled: true } },
      isInstalling: true,
    },
  },
});

export const InstallError: ComponentStoryObj<typeof Component> = merge({}, defaultProps, {
  args: {
    knowledgeBase: {
      status: {
        loading: false,
        value: { ready: false, enabled: true },
      },
      isInstalling: false,
      installError: new Error(),
    },
  },
});

export const Installed: ComponentStoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: false, value: { ready: true, enabled: true } } } },
});
