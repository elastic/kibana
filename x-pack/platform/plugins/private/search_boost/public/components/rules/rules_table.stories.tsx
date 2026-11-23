/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ContentList, ContentListFooter } from '@kbn/content-list';
import { mockRules } from '../test_utils/mock_boost_data';
import type { RulesTableProps } from './rules_table';
import { formatRuleCount } from '../../translations';
import { TableCount } from '../table_count';
import { RulesTable } from './rules_table';
import { RulesListProvider } from './rules_list_provider';

type StoryProps = RulesTableProps & { canEdit: boolean };

const profileRules = mockRules.filter(
  ({ boost_profile: profileName }) => profileName === 'logs-recent-week'
);

const meta: Meta<StoryProps> = {
  title: 'Search boost/Tables/Boost rules table on a profile page',
  args: {
    title: 'Boost rules using this profile',
    showsProfile: false,
    showsStorageSize: true,
    getRuleLinkProps: (ruleName) => ({
      href: '#',
      onClick: (event) => {
        event.preventDefault();
        action('onOpenRule')(ruleName);
      },
    }),
    canEdit: true,
  },
  render: ({ canEdit, ...tableProps }) => (
    <RulesListProvider
      rules={profileRules}
      queryKeyScope="search-boost-rules-table-story"
      searchesProfileNames={false}
      canEdit={canEdit}
      onEdit={action('onEdit')}
      onDuplicate={action('onDuplicate')}
      onDelete={action('onDelete')}
    >
      <ContentList>
        <TableCount formatTotal={formatRuleCount} />
        <RulesTable {...tableProps} />
        <ContentListFooter />
      </ContentList>
    </RulesListProvider>
  ),
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};
