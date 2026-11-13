/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiButtonEmpty } from '@elastic/eui';

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

const meta: Meta<StoryArgs> = {
  title: 'Search Boost/Matches popover',
  render: (args) => <MatchesPopoverStory {...args} />,
  args: {
    resourceType: 'index',
    matches: [{ name: 'kibana_sample_data_ecommerce' }, { name: 'synonyms' }, { name: 'users' }],
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

const outranked = { outrankedByRuleName: 'Product catalog' };

export const Indices: Story = {};

export const IndicesWithOutranked: Story = {
  args: {
    matches: [
      { name: 'archive-2024', ...outranked },
      { name: 'archive-2025', ...outranked },
      { name: 'catalog-2026-fall', ...outranked },
      { name: 'catalog-2026-spring', ...outranked },
      { name: 'kibana_sample_data_ecommerce' },
      { name: 'kibana_sample_data_flights' },
      { name: 'products', ...outranked },
      { name: 'synonyms' },
      { name: 'users' },
    ],
    hiddenCount: 5,
  },
};

export const IndicesWithHidden: Story = {
  args: {
    hiddenCount: 3,
  },
};

export const OnlyHiddenIndices: Story = {
  args: {
    matches: [],
    hiddenCount: 3,
  },
};

export const DataStreams: Story = {
  args: {
    resourceType: 'dataStream',
    matches: [{ name: 'logs-nginx-default' }, { name: 'logs-apache-default' }],
  },
};

export const DataStreamsWithOutranked: Story = {
  args: {
    resourceType: 'dataStream',
    matches: [
      { name: 'logs-nginx-default', ...outranked },
      { name: 'logs-apache-default' },
      { name: 'metrics-system-default', ...outranked },
    ],
  },
};

export const DataStreamsWithHidden: Story = {
  args: {
    resourceType: 'dataStream',
    matches: [{ name: 'logs-nginx-default' }],
    hiddenCount: 2,
  },
};

export const OnlyHiddenDataStreams: Story = {
  args: {
    resourceType: 'dataStream',
    matches: [],
    hiddenCount: 2,
  },
};

export const LongList: Story = {
  args: {
    matches: Array.from({ length: 60 }, (_, index) => ({
      name: `logs-service-${String(index + 1).padStart(3, '0')}`,
      ...(index % 7 === 0 ? outranked : {}),
    })),
    hiddenCount: 5,
  },
};
