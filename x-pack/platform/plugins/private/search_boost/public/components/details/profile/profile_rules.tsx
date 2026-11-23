/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { ContentListFooter, ContentListToolbar } from '@kbn/content-list';
import { filter } from '@kbn/content-list-toolbar';
import type { BoostProfileType, BoostRuleListItem } from '../../../../common/types';
import type { LinkProps } from '../../../types';
import { ListLayout } from '../../list_layout';
import { RulesListProvider } from '../../rules/rules_list_provider';
import { RulesTable } from '../../rules/rules_table';
import { TableCount } from '../../table_count';
import {
  CREATE_RULE_LABEL,
  NOT_IN_USE_BODIES,
  NOT_IN_USE_READ_ONLY_BODY,
  NOT_IN_USE_TITLE,
  NO_ITEMS_FOUND,
  PROFILE_RULES_TITLE,
  formatRuleCount,
} from '../../../translations';

// An empty `Filters` falls back to the default filters, such as the sort menu.
const SuppressDefaultFilters = filter.createComponent({ resolve: () => undefined });

export interface ProfileRulesProps {
  profileName: string;
  type: BoostProfileType;
  /** Must keep its identity between renders, since a new array reloads the list. */
  rules: BoostRuleListItem[];
  getRuleLinkProps: (ruleName: string) => LinkProps;
  canEdit: boolean;
  onCreateRule?: () => void;
  onEditRule?: (rule: BoostRuleListItem) => void;
  /** Custom rules only. */
  onDuplicateRule?: (rule: BoostRuleListItem) => void;
  /** Custom rules only. */
  onDeleteRule?: (rule: BoostRuleListItem) => void;
}

/** The boost rules that use a profile, with the storage size of what each applies to. */
export const ProfileRules = ({
  profileName,
  type,
  rules,
  getRuleLinkProps,
  canEdit,
  onCreateRule,
  onEditRule,
  onDuplicateRule,
  onDeleteRule,
}: ProfileRulesProps) => {
  const createButton = canEdit && onCreateRule && (
    <EuiButton fill size="s" onClick={onCreateRule} data-test-subj="searchBoostProfileCreateRule">
      {CREATE_RULE_LABEL}
    </EuiButton>
  );

  if (rules.length === 0) {
    return (
      <EuiEmptyPrompt
        titleSize="xs"
        title={<h3>{NOT_IN_USE_TITLE}</h3>}
        body={createButton ? NOT_IN_USE_BODIES[type] : NOT_IN_USE_READ_ONLY_BODY}
        actions={createButton}
        data-test-subj="searchBoostProfileNotInUse"
      />
    );
  }

  return (
    <RulesListProvider
      key={profileName}
      rules={rules}
      queryKeyScope={`search-boost-profile-rules-${profileName}`}
      searchesProfileNames={false}
      canEdit={canEdit}
      onEdit={onEditRule}
      onDuplicate={onDuplicateRule}
      onDelete={onDeleteRule}
    >
      <ListLayout
        toolbar={
          <ContentListToolbar>
            <ContentListToolbar.Filters>
              <SuppressDefaultFilters />
            </ContentListToolbar.Filters>
          </ContentListToolbar>
        }
        toolbarAppend={createButton}
        emptyState={<EuiEmptyPrompt body={NO_ITEMS_FOUND} />}
        data-test-subj="searchBoostProfileRules"
      >
        <TableCount formatTotal={formatRuleCount} data-test-subj="searchBoostProfileRulesCount" />
        <RulesTable
          title={PROFILE_RULES_TITLE}
          showsProfile={false}
          showsStorageSize
          getRuleLinkProps={getRuleLinkProps}
          data-test-subj="searchBoostProfileRulesTable"
        />
        <ContentListFooter />
      </ListLayout>
    </RulesListProvider>
  );
};
