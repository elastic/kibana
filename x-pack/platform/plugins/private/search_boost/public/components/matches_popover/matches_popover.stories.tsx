/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiButtonEmpty } from '@elastic/eui';

import type { BoostRuleMatch } from '../../../common/types';
import type { MatchesPopoverProps } from './matches_popover';
import { MatchesPopover } from './matches_popover';

type StoryArgs = Omit<MatchesPopoverProps, 'button' | 'isOpen' | 'closePopover'>;

const MatchesPopoverStory = (args: StoryArgs) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <MatchesPopover
      {...args}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonEmpty size="s" onClick={() => setIsOpen((open) => !open)}>
          {'Show matches'}
        </EuiButtonEmpty>
      }
    />
  );
};

const match = (name: string, overrides: Partial<BoostRuleMatch> = {}): BoostRuleMatch => ({
  name,
  isHidden: false,
  ...overrides,
});

const outranked = { outrankedByRuleName: 'Product catalog' };

const hiddenMatches = (count: number): BoostRuleMatch[] =>
  Array.from({ length: count }, (_, index) => match(`.hidden-${index + 1}`, { isHidden: true }));

const meta: Meta<StoryArgs> = {
  title: 'Search boost/Matches popover',
  render: (args) => <MatchesPopoverStory {...args} />,
  args: {
    type: 'indices',
    matches: [match('kibana_sample_data_ecommerce'), match('synonyms'), match('users')],
  },
  argTypes: {
    type: { control: 'radio', options: ['indices', 'data_streams'] },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {};

export const WithOutranked: Story = {
  args: {
    matches: [
      match('archive-2024', outranked),
      match('archive-2025', outranked),
      match('catalog-2026-fall', outranked),
      match('catalog-2026-spring', outranked),
      match('kibana_sample_data_ecommerce'),
      match('kibana_sample_data_flights'),
      match('products', outranked),
      match('synonyms'),
      match('users'),
      ...hiddenMatches(5),
    ],
  },
};

export const WithHidden: Story = {
  args: {
    matches: [
      match('kibana_sample_data_ecommerce'),
      match('synonyms'),
      match('users'),
      ...hiddenMatches(3),
    ],
  },
};

export const OnlyHidden: Story = {
  args: {
    matches: hiddenMatches(3),
  },
};

export const LongList: Story = {
  args: {
    matches: [
      ...Array.from({ length: 60 }, (_, index) =>
        match(
          `logs-service-${String(index + 1).padStart(3, '0')}`,
          index % 7 === 0 ? outranked : {}
        )
      ),
      ...hiddenMatches(5),
    ],
  },
};
