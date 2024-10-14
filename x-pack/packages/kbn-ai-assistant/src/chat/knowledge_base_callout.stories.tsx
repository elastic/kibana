/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import { merge } from 'lodash';
import { KibanaReactStorybookDecorator } from '../utils/storybook_decorator.stories';
import { KnowledgeBaseCallout as Component } from './knowledge_base_callout';

const meta: Meta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/KnowledgeBaseCallout',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;
const defaultProps: StoryObj<typeof Component> = {
  args: {
    knowledgeBase: {
      status: {
        loading: false,
        value: {
          ready: false,
        },
        refresh: () => {},
      },
      isInstalling: false,
      installError: undefined,
      install: async () => {},
    },
  },
};

export const StatusError: StoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: false, error: new Error() } } },
});

export const Loading: StoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: true } } },
});

export const NotInstalled: StoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: false, value: { ready: false } } } },
});

export const Installing: StoryObj<typeof Component> = merge({}, defaultProps, {
  args: {
    knowledgeBase: { status: { loading: false, value: { ready: false } }, isInstalling: true },
  },
});

export const InstallError: StoryObj<typeof Component> = merge({}, defaultProps, {
  args: {
    knowledgeBase: {
      status: {
        loading: false,
        value: { ready: false },
      },
      isInstalling: false,
      installError: new Error(),
    },
  },
});

export const Installed: StoryObj<typeof Component> = merge({}, defaultProps, {
  args: { knowledgeBase: { status: { loading: false, value: { ready: true } } } },
});
