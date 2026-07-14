/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSnoozeSettings, SnoozeSchedule } from '../../../../../types';

export interface RulesListNotifyBadgeProps {
  /**
   *  Rule's snooze settings
   */
  snoozeSettings: RuleSnoozeSettings | undefined;
  /**
   * Displays the component in the loading state. If isLoading = false and snoozeSettings aren't set
   * and the component is shown in disabled state.
   */
  loading?: boolean;
  /**
   * Whether the component is disabled or not, string give a disabled reason displayed as a tooltip
   */
  disabled?: boolean | string;
  onRuleChanged: () => void | Promise<void>;
  snoozeRule: (schedule: SnoozeSchedule, muteAll?: boolean) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  showTooltipInline?: boolean;
  showOnHover?: boolean;
  isRuleEditable?: boolean;
  /**
   * When provided, the snooze panel is rendered as a popover anchored to this element (e.g. an app
   * menu item) and its open state is controlled via `isOpen`/`onClose`, instead of rendering the
   * badge's own trigger button.
   */
  anchorElement?: HTMLElement | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export type RulesListNotifyBadgePropsWithApi = Pick<
  RulesListNotifyBadgeProps,
  | 'snoozeSettings'
  | 'loading'
  | 'disabled'
  | 'onRuleChanged'
  | 'showOnHover'
  | 'showTooltipInline'
  | 'anchorElement'
  | 'isOpen'
  | 'onClose'
> & {
  /**
   * Rule's SO id
   */
  ruleId: string;
};
