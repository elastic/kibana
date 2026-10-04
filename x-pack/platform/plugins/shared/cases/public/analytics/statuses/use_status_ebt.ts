/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CaseStatuses } from '../../../common/types/domain';
import {
  CASES_STATUS_CHANGED_EVENT_TYPE,
  CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE,
} from '../../../common/constants';
import { DEFAULT_CASE_PAUSE_REASONS } from '../../../common/utils/statuses';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { getEbtOwner } from '../get_ebt_owner';

export type StatusChangeEntryPoint =
  | 'case_view_header'
  | 'case_view_sidebar'
  | 'case_view_activity_button'
  | 'list_row_action'
  | 'list_bulk_action';

export type StatusConfigurationAction =
  | 'added'
  | 'renamed'
  | 'reordered'
  | 'default_changed'
  | 'disabled'
  | 'enabled'
  | 'pausing_changed'
  | 'reasons_edited';

export const useStatusChangedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({
      category,
      isCustom,
      entryPoint,
      pausesTimeTracking = false,
      pauseReason,
    }: {
      category: CaseStatuses;
      isCustom: boolean;
      entryPoint: StatusChangeEntryPoint;
      pausesTimeTracking?: boolean;
      pauseReason?: string;
    }) => {
      analytics.reportEvent(CASES_STATUS_CHANGED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        category,
        is_custom: isCustom,
        entry_point: entryPoint,
        pauses_time_tracking: pausesTimeTracking,
        // Configurable text never leaves the cluster; only the seeded defaults are named.
        ...(pauseReason != null && {
          pause_reason: (DEFAULT_CASE_PAUSE_REASONS as readonly string[]).includes(pauseReason)
            ? pauseReason
            : 'custom',
        }),
      });
    },
    [analytics, owner]
  );
};

export const useStatusConfigurationEditedEBT = () => {
  const { analytics } = useKibana().services;
  const { owner } = useCasesContext();

  return useCallback(
    ({ category, action }: { category: CaseStatuses; action: StatusConfigurationAction }) => {
      analytics.reportEvent(CASES_STATUS_CONFIGURATION_EDITED_EVENT_TYPE, {
        owner: getEbtOwner(owner),
        category,
        action,
      });
    },
    [analytics, owner]
  );
};
