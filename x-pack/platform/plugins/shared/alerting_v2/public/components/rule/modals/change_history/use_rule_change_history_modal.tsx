/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { RuleChangeHistoryApi } from '../../../../services/rule_change_history_api';
import { AutoOpenChangeHistoryModal } from './auto_open_change_history_modal';
import { createRuleChangeHistoryAdapter } from './rule_change_history_adapter';
import { RuleChangeHistoryProvider } from './rule_change_history_provider';

export interface RuleChangeHistoryTarget {
  id: string;
  name: string;
}

export interface UseRuleChangeHistoryModalOptions {
  /** Enable restore affordances when the read API + permissions allow it. */
  canRestore?: boolean;
}

export interface UseRuleChangeHistoryModalResult {
  /** Opens the modal for a rule; re-opening the same rule remounts and re-opens. */
  openChangeHistory: (rule: RuleChangeHistoryTarget) => void;
  /** Render this next to the host's content (like a flyout element). */
  changeHistoryModal: React.ReactNode;
}

/** Combines rule id and open count into a remount key (see below). */
const toModalKey = ({ id }: RuleChangeHistoryTarget, openCount: number): string =>
  `${id}:${openCount}`;

/**
 * Shared hook for the rule change-history modal, reused by rule details and the
 * rules list. Wires the adapter and analytics from DI, tracks the selected rule,
 * and returns an imperative opener plus a renderable modal element.
 *
 * The provider mounts only once a rule is selected and is keyed by rule id + open
 * count, so every open request mounts a fresh provider that auto-opens. This
 * sidesteps the provider's reset-on-`objectId` and re-opens even for the same rule.
 */
export const useRuleChangeHistoryModal = ({
  canRestore = false,
}: UseRuleChangeHistoryModalOptions = {}): UseRuleChangeHistoryModalResult => {
  const api = useService(RuleChangeHistoryApi);
  const analytics = useService(CoreStart('analytics'));
  const adapter = createRuleChangeHistoryAdapter(api);

  const [target, setTarget] = useState<RuleChangeHistoryTarget | null>(null);
  // Advances on every open request so re-opening the same rule remounts the modal.
  const [openCount, setOpenCount] = useState(0);

  const openChangeHistory = useCallback((rule: RuleChangeHistoryTarget) => {
    setTarget(rule);
    setOpenCount((count) => count + 1);
  }, []);

  const changeHistoryModal = target ? (
    <RuleChangeHistoryProvider
      key={toModalKey(target, openCount)}
      ruleId={target.id}
      ruleName={target.name}
      adapter={adapter}
      analytics={analytics}
      canRestore={canRestore}
    >
      <AutoOpenChangeHistoryModal />
    </RuleChangeHistoryProvider>
  ) : null;

  return { openChangeHistory, changeHistoryModal };
};
