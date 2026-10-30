/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { CASE_STATUS_COLORS } from '../../../common/constants';
import type {
  CaseStatusCategory,
  CaseStatusDefinition,
  CaseStatuses,
} from '../../../common/types/domain';
import {
  CATEGORY_TO_STATUS,
  DEFAULT_CASE_STATUSES,
  getCaseStatus,
  getDefaultStatus,
} from '../../../common/utils/statuses';
import { isCustomStatusesEnabled } from '../../common/custom_statuses';
import { useGetCaseStatuses } from '../../containers/use_get_case_statuses';
import { statuses as categoryStatuses } from './config';

/** The status fields of a case. `statusKey` is missing or null on cases written before statuses. */
export interface CaseStatusRef {
  status: CaseStatuses;
  statusKey?: string | null;
}

/** The status key of a case, or null for a case written before statuses. */
export const getCaseStatusKey = ({ statusKey }: CaseStatusRef): string | null => statusKey ?? null;

type CaseStatusColor = CaseStatusDefinition['color'];

const isCaseStatusColor = (color: string): color is CaseStatusColor =>
  (CASE_STATUS_COLORS as readonly string[]).includes(color);

/** The three statuses as they looked before custom statuses: category labels and colors. */
const CATEGORY_STATUSES: CaseStatusDefinition[] = DEFAULT_CASE_STATUSES.map((status) => {
  const { label, color } = categoryStatuses[CATEGORY_TO_STATUS[status.category]];

  return { ...status, label, color: isCaseStatusColor(color) ? color : status.color };
});

/** The props of the `Status` badge for a status definition. */
export const getStatusBadgeProps = (
  status: CaseStatusDefinition
): { status: CaseStatuses; label: string; color: CaseStatusColor } => ({
  status: CATEGORY_TO_STATUS[status.category],
  label: status.label,
  color: status.color,
});

/**
 * The statuses cases in this space can be in. Without custom statuses these are the three
 * category statuses with their usual labels and colors.
 */
export const useCaseStatuses = () => {
  const isEnabled = isCustomStatusesEnabled();
  const { data, isLoading } = useGetCaseStatuses();
  const statuses = isEnabled ? data : CATEGORY_STATUSES;

  const enabledStatuses = useMemo(() => statuses.filter((status) => !status.disabled), [statuses]);

  /** The status a case is in; legacy cases read as their category's default status. */
  const getStatus = useCallback(
    ({ status, statusKey }: CaseStatusRef): CaseStatusDefinition =>
      getCaseStatus(statuses, { status, statusKey: isEnabled ? statusKey : null }),
    [isEnabled, statuses]
  );

  /**
   * The statuses a picker lists: the enabled ones in admin order, plus the current status when it
   * is disabled so the picker can still show it.
   */
  const getPickableStatuses = useCallback(
    (current?: CaseStatusDefinition): CaseStatusDefinition[] =>
      current?.disabled
        ? statuses.filter((status) => !status.disabled || status.key === current.key)
        : enabledStatuses,
    [enabledStatuses, statuses]
  );

  /** The first enabled status of a category, in admin order. */
  const getFirstStatusOfCategory = useCallback(
    (category: CaseStatusCategory): CaseStatusDefinition =>
      enabledStatuses.find((status) => status.category === category) ??
      getDefaultStatus(statuses, category),
    [enabledStatuses, statuses]
  );

  return {
    statuses,
    enabledStatuses,
    isCustomStatusesEnabled: isEnabled,
    isLoading,
    getStatus,
    getPickableStatuses,
    getFirstStatusOfCategory,
  };
};

export type UseCaseStatuses = ReturnType<typeof useCaseStatuses>;

/** The status definition a case is in. */
export const useCaseStatus = (theCase: CaseStatusRef): CaseStatusDefinition =>
  useCaseStatuses().getStatus(theCase);
