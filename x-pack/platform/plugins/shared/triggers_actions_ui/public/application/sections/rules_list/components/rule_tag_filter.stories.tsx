/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentProps } from 'react';
import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { RuleTagFilter } from './rule_tag_filter';

type Args = ComponentProps<typeof RuleTagFilter>;

export default {
  title: 'app/RuleTagFilter',
  component: RuleTagFilter,
  argTypes: {
    tags: {
      defaultValue: ['tag1', 'tag2', 'tag3'],
      control: {
        type: 'object',
      },
    },
    selectedTags: {
      defaultValue: [],
      control: {
        type: 'object',
      },
    },
    isGrouped: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    isLoading: {
      defaultValue: false,
      control: {
        type: 'boolean',
      },
    },
    loadingMessage: {
      control: {
        type: 'text',
      },
    },
    noMatchesMessage: {
      control: {
        type: 'text',
      },
    },
    emptyMessage: {
      control: {
        type: 'text',
      },
    },
    errorMessage: {
      control: {
        type: 'text',
      },
    },
    dataTestSubj: {
      control: {
        type: 'text',
      },
    },
    selectableDataTestSubj: {
      control: {
        type: 'text',
      },
    },
    optionDataTestSubj: {
      control: {
        type: 'text',
      },
    },
    buttonDataTestSubj: {
      control: {
        type: 'text',
      },
    },
    onChange: {},
  },
  args: {
    onChange: (...args: any) => action('onChange')(args),
  },
};

const Template: Story<Args> = (args) => {
  return <RuleTagFilter {...args} />;
};

export const Default = Template.bind({});

export const Selected = Template.bind({});

Selected.args = {
  selectedTags: ['tag1'],
};
