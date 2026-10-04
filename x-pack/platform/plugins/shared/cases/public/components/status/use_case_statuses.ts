/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type {
  CaseStatusConfiguration,
  CaseStatusesConfiguration,
  CaseStatuses,
} from '../../../common/types/domain';
import {
  CASE_STATUS_CATEGORIES,
  findStatusByKey,
  getBuiltInStatuses,
  getDefaultStatus,
  getEffectiveStatuses,
} from '../../../common/utils/statuses';
import { useCasesConfig } from '../../common/lib/kibana';
import { useGetCaseConfigurationsQuery } from '../../containers/configure/use_get_case_configurations_query';
import type { CasesConfigurationUI } from '../../containers/types';
import { useCasesContext } from '../cases_context/use_cases_context';

const selectConfigurations = (data: CasesConfigurationUI[] | null) => data ?? [];

const categoryRank = (status: CaseStatusConfiguration) =>
  CASE_STATUS_CATEGORIES.indexOf(status.category);

/**
 * Merges per-owner lists by key; the first owner to define a key wins. Only the Stack page,
 * which shows every owner's cases, ends up with more than one list. Pickers list the result
 * flat, so it is ordered by category first and the configured order within it.
 */
const unionStatuses = (lists: CaseStatusesConfiguration[]): CaseStatusesConfiguration => {
  const byKey = new Map<string, CaseStatusConfiguration>();
  lists.flat().forEach((status) => {
    if (!byKey.has(status.key)) {
      byKey.set(status.key, status);
    }
  });
  return [...byKey.values()].sort((a, b) => categoryRank(a) - categoryRank(b) || a.order - b.order);
};

/**
 * The statuses cases in the current context can be in: the configured lists of the owners in
 * context, or the built-in three when custom statuses are off or nothing is configured.
 */
export const useCaseStatuses = () => {
  const { customStatusesEnabled } = useCasesConfig();
  const { owner } = useCasesContext();
  const { data: configurations, isLoading } = useGetCaseConfigurationsQuery({
    select: selectConfigurations,
  });

  const statuses = useMemo(() => {
    if (!customStatusesEnabled) {
      return getBuiltInStatuses();
    }

    const inContext =
      owner.length === 0
        ? configurations
        : configurations.filter((configuration) => owner.includes(configuration.owner));

    return unionStatuses(
      inContext.map((configuration) => getEffectiveStatuses(configuration.statuses))
    );
  }, [configurations, customStatusesEnabled, owner]);

  const enabledStatuses = useMemo(() => statuses.filter((status) => !status.disabled), [statuses]);

  /** Reasons of the owners in context, deduplicated; empty while custom statuses are off. */
  const pauseReasons = useMemo(() => {
    if (!customStatusesEnabled) {
      return [];
    }
    const inContext =
      owner.length === 0
        ? configurations
        : configurations.filter((configuration) => owner.includes(configuration.owner));
    return [...new Set(inContext.flatMap((configuration) => configuration.pauseReasons ?? []))];
  }, [configurations, customStatusesEnabled, owner]);

  /**
   * The configured status a case is on, falling back to its category's default (and then to the
   * built-in status) so cases written before statuses were configured still render.
   */
  const getStatus = useCallback(
    (statusKey: string | null | undefined, category: CaseStatuses): CaseStatusConfiguration =>
      (statusKey != null ? findStatusByKey(statuses, statusKey) : undefined) ??
      getDefaultStatus(statuses, category) ??
      (getBuiltInStatuses().find(
        (status) => status.category === category
      ) as CaseStatusConfiguration),
    [statuses]
  );

  return {
    statuses,
    enabledStatuses,
    pauseReasons,
    getStatus,
    isCustomStatusesEnabled: customStatusesEnabled,
    isLoading,
  };
};

export type UseCaseStatuses = ReturnType<typeof useCaseStatuses>;
