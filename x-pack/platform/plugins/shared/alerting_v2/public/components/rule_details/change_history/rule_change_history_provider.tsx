/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ChangeHistoryModal,
  ChangeHistoryProvider,
  type ChangeHistoryAdapter,
} from '@kbn/change-history-ui';
import { RULE_CHANGE_HISTORY_SCOPE } from './constants';
import { renderRuleChangeHistoryJsonPreview } from './rule_change_history_json_preview';

export interface RuleChangeHistoryProviderProps {
  ruleId: string;
  ruleName: string;
  adapter: ChangeHistoryAdapter;
  children: React.ReactNode;
  /** Enable restore affordances when the adapter implements `restoreChange`. */
  canRestore?: boolean;
}

/**
 * Domain wrapper around {@link ChangeHistoryProvider} for alerting v2 rules.
 * Preview renders a JSON (or JSON-diff) view of rule snapshots.
 */
export const RuleChangeHistoryProvider = ({
  ruleId,
  ruleName,
  adapter,
  children,
  canRestore = false,
}: RuleChangeHistoryProviderProps): JSX.Element => {
  const features = useMemo(
    () => ({
      compare: true,
      restore: canRestore,
    }),
    [canRestore]
  );

  return (
    <ChangeHistoryProvider
      objectId={ruleId}
      adapter={adapter}
      renderPreview={renderRuleChangeHistoryJsonPreview}
      labels={{ previewTitle: ruleName }}
      scope={RULE_CHANGE_HISTORY_SCOPE}
      features={features}
      permissions={{ canRestore }}
    >
      {children}
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};
