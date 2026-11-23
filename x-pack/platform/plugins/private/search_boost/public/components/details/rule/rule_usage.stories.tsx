/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { getMockRule } from '../../test_utils/mock_details_data';
import { RuleUsage } from './rule_usage';

const meta: Meta<typeof RuleUsage> = {
  component: RuleUsage,
  title: 'Search boost/Details/Rule usage',
  args: { rule: getMockRule('catalog') },
};

export default meta;

type Story = StoryObj<typeof RuleUsage>;

export const Default: Story = {};

/** Some matches are outranked, so it applies to fewer than it matches. */
export const Outranked: Story = {
  args: { rule: getMockRule('default_indices') },
};
