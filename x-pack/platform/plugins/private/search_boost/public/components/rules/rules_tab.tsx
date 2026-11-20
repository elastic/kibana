/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { ContentListFooter, ContentListToolbar } from '@kbn/content-list';
import { ListLayout } from '../list_layout';
import { TableCount } from '../table_count';
import { TypeFilter } from '../type_filter';
import { ProfileFilter } from './profile_filter';
import type { RulesListProviderProps } from './rules_list_provider';
import { RulesListProvider } from './rules_list_provider';
import type { RulesTableProps } from './rules_table';
import { RulesTable } from './rules_table';
import {
  CREATE_RULE_LABEL,
  NO_ITEMS_FOUND,
  RULES_TABLE_CAPTION,
  formatRuleCount,
} from '../../translations';

const QUERY_KEY_SCOPE = 'search-boost-rules';

export type RulesTabProps = Omit<RulesListProviderProps, 'queryKeyScope' | 'children'> &
  Pick<RulesTableProps, 'getRuleLinkProps'> & {
    onCreate?: () => void;
  };

export const RulesTab = ({ getRuleLinkProps, onCreate, ...listProps }: RulesTabProps) => (
  <RulesListProvider
    // Content List reads the initial search once, so a new profile starts the list again.
    key={listProps.initialProfileName}
    {...listProps}
    queryKeyScope={QUERY_KEY_SCOPE}
  >
    <ListLayout
      toolbar={
        <ContentListToolbar>
          <ContentListToolbar.Filters>
            <ProfileFilter />
            <TypeFilter />
          </ContentListToolbar.Filters>
        </ContentListToolbar>
      }
      toolbarAppend={
        listProps.canEdit &&
        onCreate && (
          <EuiButton fill size="s" onClick={onCreate} data-test-subj="searchBoostCreateRule">
            {CREATE_RULE_LABEL}
          </EuiButton>
        )
      }
      emptyState={<EuiEmptyPrompt body={NO_ITEMS_FOUND} />}
      data-test-subj="searchBoostRules"
    >
      <TableCount formatTotal={formatRuleCount} data-test-subj="searchBoostRulesCount" />
      <RulesTable
        title={RULES_TABLE_CAPTION}
        getRuleLinkProps={getRuleLinkProps}
        data-test-subj="searchBoostRulesTable"
      />
      <ContentListFooter />
    </ListLayout>
  </RulesListProvider>
);
