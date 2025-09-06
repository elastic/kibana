/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { RuleType } from '../../../../types';
import type { ComponentOpts as RuleApis } from '../../common/components/with_bulk_rule_api_operations';
import { RuleGapListTable } from './rule_gap_list_table';
import type { RefreshToken } from './types';

const RULE_GAP_LIST_STORAGE_KEY = 'xpack.triggersActionsUI.ruleGapList.initialColumns';

const ruleGapListContainerStyle = { minHeight: 400 };

export interface RuleGapListProps {
  ruleId: string;
  ruleType: RuleType;
  localStorageKey?: string;
  refreshToken?: RefreshToken;
  requestRefresh?: () => Promise<void>;
  loadGaps?: RuleApis['loadGaps'];
  fetchRuleSummary?: boolean;
  hideChart?: boolean;
}

export const RuleGapList = (props: RuleGapListProps) => {
  const { ruleId, localStorageKey = RULE_GAP_LIST_STORAGE_KEY, refreshToken } = props;

  return (
    <div style={ruleGapListContainerStyle} data-test-subj="ruleGapListContainer">
      <EuiSpacer />
      <RuleGapListTable
        localStorageKey={localStorageKey}
        ruleId={ruleId}
        refreshToken={refreshToken}
      />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleGapList as default };
