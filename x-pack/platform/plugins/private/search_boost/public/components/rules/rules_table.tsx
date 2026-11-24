/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLatest from 'react-use/lib/useLatest';
import { EuiCode } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list';
import { NameCell } from '../name_cell';
import type { LinkProps } from '../../types';
import { formatStorageSize } from '../format';
import {
  DEFAULT_RULE_BADGE,
  PROFILE_NAME_LABEL,
  RULE_COLUMNS,
  STORAGE_SIZE_LABEL,
} from '../../translations';
import { AppliesTo } from './applies_to';
import { DELETE_ACTION_PROPS, DUPLICATE_ACTION_PROPS } from '../item_actions';
import { useRuleItem } from './rules_list_provider';

const { Column, Action } = ContentListTable;

const DEFAULT_RULE_BADGE_PROPS = {
  label: DEFAULT_RULE_BADGE,
  'data-test-subj': 'searchBoostDefaultRuleBadge',
};

export interface RulesTableProps {
  title: string;
  showsProfile?: boolean;
  showsStorageSize?: boolean;
  getRuleLinkProps: (ruleName: string) => LinkProps;
  'data-test-subj'?: string;
}

export const RulesTable = ({
  title,
  showsProfile = true,
  showsStorageSize = false,
  getRuleLinkProps,
  'data-test-subj': dataTestSubj,
}: RulesTableProps) => {
  // Content List keeps the first render's cell renderers, so they read the latest getters.
  const latest = useLatest({ getRuleLinkProps });
  const getRule = useRuleItem();
  const isCustomRule = (item: ContentListItem) => getRule(item)?.is_builtin === false;

  return (
    <ContentListTable title={title} data-test-subj={dataTestSubj}>
      <Column.Name
        columnTitle={RULE_COLUMNS.name}
        width="24em"
        render={(item) => (
          <NameCell
            name={item.title}
            linkProps={latest.current.getRuleLinkProps(item.title)}
            badge={getRule(item)?.is_builtin ? DEFAULT_RULE_BADGE_PROPS : undefined}
            data-test-subj="searchBoostRuleLink"
          />
        )}
      />
      {showsProfile && (
        <Column
          id="boost_profile"
          name={PROFILE_NAME_LABEL}
          width="18em"
          minWidth="12em"
          sortable
          render={(item) => getRule(item)?.boost_profile}
        />
      )}
      <Column
        id="index_pattern"
        name={RULE_COLUMNS.targets}
        width="14em"
        sortable
        render={(item) => <EuiCode>{getRule(item)?.index_pattern}</EuiCode>}
      />
      <Column
        id="priority"
        name={RULE_COLUMNS.priority}
        width="7em"
        sortable
        render={(item) => getRule(item)?.priority}
      />
      <Column
        id="appliesTo"
        name={RULE_COLUMNS.appliesTo}
        width="12em"
        sortable
        render={(item) => {
          const rule = getRule(item);
          return (
            rule && (
              <AppliesTo type={rule.type} appliedCount={rule.appliesTo} matches={rule.matches} />
            )
          );
        }}
      />
      {showsStorageSize && (
        <Column
          id="storageSizeInBytes"
          name={STORAGE_SIZE_LABEL}
          width="9em"
          sortable
          render={(item) => {
            const rule = getRule(item);
            return rule && formatStorageSize(rule.storageSizeInBytes);
          }}
        />
      )}
      <Column.Actions>
        <Action.Edit />
        <Action
          {...DUPLICATE_ACTION_PROPS}
          available={isCustomRule}
          data-test-subj="searchBoostDuplicateRule"
        />
        <Action
          {...DELETE_ACTION_PROPS}
          available={isCustomRule}
          data-test-subj="searchBoostDeleteRule"
        />
      </Column.Actions>
    </ContentListTable>
  );
};
