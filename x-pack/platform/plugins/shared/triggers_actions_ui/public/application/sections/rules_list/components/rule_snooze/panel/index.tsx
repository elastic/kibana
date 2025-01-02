/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { SnoozeSchedule } from '../../../../../../types';
import { RuleSnoozeScheduler } from '../scheduler';
import { BaseSnoozePanel, BaseSnoozePanelProps } from './base_snooze_panel';

export { futureTimeToInterval } from './helpers';

type SnoozePanelProps = Pick<
  BaseSnoozePanelProps,
  | 'interval'
  | 'snoozeRule'
  | 'unsnoozeRule'
  | 'showCancel'
  | 'scheduledSnoozes'
  | 'activeSnoozes'
  | 'hasTitle'
  | 'inPopover'
  | 'showAddSchedule'
>;

export const SnoozePanel: React.FC<SnoozePanelProps> = ({
  interval,
  snoozeRule,
  unsnoozeRule,
  showCancel,
  scheduledSnoozes,
  activeSnoozes,
  hasTitle = true,
  inPopover = false,
  showAddSchedule,
}) => {
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [initialSchedule, setInitialSchedule] = useState<SnoozeSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSnoozeRule = useCallback(
    async (schedule: SnoozeSchedule) => {
      setIsLoading(true);
      try {
        await snoozeRule(schedule);
      } finally {
        if (!inPopover) {
          setIsLoading(false);
        }
      }
    },
    [inPopover, setIsLoading, snoozeRule]
  );

  const onUnsnoozeRule = useCallback(
    async (scheduleIds?: string[]) => {
      setIsLoading(true);
      try {
        await unsnoozeRule(scheduleIds);
      } finally {
        if (!inPopover) {
          setIsLoading(false);
        }
      }
    },
    [inPopover, setIsLoading, unsnoozeRule]
  );

  const saveSnoozeSchedule = useCallback(
    async (schedule: SnoozeSchedule) => {
      setIsLoading(true);
      try {
        await snoozeRule(schedule);
      } finally {
        if (!inPopover) {
          setIsLoading(false);
        }
      }
    },
    [inPopover, snoozeRule, setIsLoading]
  );

  const cancelSnoozeSchedules = useCallback(
    async (scheduleIds: string[]) => {
      setIsLoading(true);
      try {
        await unsnoozeRule(scheduleIds);
      } finally {
        if (!inPopover) {
          setIsLoading(false);
        }
      }
    },
    [inPopover, unsnoozeRule, setIsLoading]
  );

  const onOpenScheduler = useCallback(
    (schedule?: SnoozeSchedule) => {
      setInitialSchedule(schedule ?? null);
      setIsSchedulerOpen(true);
    },
    [setInitialSchedule, setIsSchedulerOpen]
  );

  const onCloseScheduler = useCallback(() => setIsSchedulerOpen(false), [setIsSchedulerOpen]);

  return !isSchedulerOpen ? (
    <BaseSnoozePanel
      isLoading={isLoading}
      snoozeRule={onSnoozeRule}
      unsnoozeRule={onUnsnoozeRule}
      interval={interval}
      showCancel={showCancel}
      showAddSchedule={showAddSchedule}
      scheduledSnoozes={scheduledSnoozes}
      activeSnoozes={activeSnoozes}
      navigateToScheduler={onOpenScheduler}
      onRemoveAllSchedules={cancelSnoozeSchedules}
      hasTitle={hasTitle}
      inPopover={inPopover}
    />
  ) : (
    <RuleSnoozeScheduler
      isLoading={isLoading}
      initialSchedule={initialSchedule}
      onClose={onCloseScheduler}
      onSaveSchedule={saveSnoozeSchedule}
      onCancelSchedules={cancelSnoozeSchedules}
      hasTitle={hasTitle}
      inPopover={inPopover}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SnoozePanel as default };
