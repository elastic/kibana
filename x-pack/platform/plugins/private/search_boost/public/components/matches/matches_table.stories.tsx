/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { createMockMatches, withOutranked } from '../test_utils/mock_boost_data';
import { MatchesTable } from './matches_table';

const meta: Meta<typeof MatchesTable> = {
  component: MatchesTable,
  title: 'Search boost/Tables/Rule matches table',
  args: {
    type: 'indices',
    matches: withOutranked(createMockMatches('indices', 23), 'catalog', [1, 4]),
    isOutrankingComputed: true,
    getMatchLinkProps: (name) => ({
      href: '#',
      onClick: (event) => {
        event.preventDefault();
        action('onOpenMatch')(name);
      },
    }),
    getRuleLinkProps: (ruleName) => ({
      href: '#',
      onClick: (event) => {
        event.preventDefault();
        action('onOpenRule')(ruleName);
      },
    }),
  },
};

export default meta;

type Story = StoryObj<typeof MatchesTable>;

export const Indices: Story = {
  args: { queryKeyScope: 'search-boost-matches-indices-story' },
};

export const DataStreams: Story = {
  args: {
    type: 'data_streams',
    matches: withOutranked(createMockMatches('data_streams', 12), 'apache-logs', [2, 5]),
    queryKeyScope: 'search-boost-matches-data-streams-story',
  },
};

export const NoMatches: Story = {
  args: { matches: [], queryKeyScope: 'search-boost-matches-empty-story' },
};
