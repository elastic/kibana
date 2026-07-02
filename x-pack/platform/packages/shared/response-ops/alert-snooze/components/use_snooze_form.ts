/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { ConditionalSnoozeSchedule, SnoozePanelTab } from './types';

export type AlertSnoozePayload = ConditionalSnoozeSchedule;

/**
 * Shared form state for the snooze UI (tabs + payload building), used by both
 * `AlertSnoozePopover` and `AlertSnoozePanelInline` so their form logic stays in
 * one place. The chrome around the form (popover vs inline back/footer) is owned
 * by each consumer.
 */
export const useSnoozeForm = (onApply: (payload: AlertSnoozePayload) => void) => {
  const [activeTab, setActiveTab] = useState<SnoozePanelTab>('quick');

  // `undefined` = invalid / nothing to apply, `null` = indefinite, string = ISO end date.
  const [quickEndDate, setQuickEndDate] = useState<string | null | undefined>(undefined);
  const [conditionalSchedule, setConditionalSchedule] = useState<
    ConditionalSnoozeSchedule | undefined
  >(undefined);

  const isApplyDisabled =
    activeTab === 'quick' ? quickEndDate === undefined : conditionalSchedule === undefined;

  /** Emits the current tab's payload via `onApply`. Returns `false` (no-op) when
   * there is nothing valid to apply, so callers can decide whether to close. */
  const applySnooze = useCallback((): boolean => {
    if (activeTab === 'quick') {
      if (quickEndDate === undefined) return false;
      onApply({ expiresAt: quickEndDate });
    } else {
      if (conditionalSchedule === undefined) return false;
      onApply(conditionalSchedule);
    }
    return true;
  }, [activeTab, quickEndDate, conditionalSchedule, onApply]);

  return {
    activeTab,
    setActiveTab,
    setQuickEndDate,
    setConditionalSchedule,
    isApplyDisabled,
    applySnooze,
  };
};
