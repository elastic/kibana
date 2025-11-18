/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CaseUI } from './types';
import { type GetAttachments } from '../components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useFindCasesContainingAllSelectedAlerts } from './use_find_cases_containing_all_selected_alerts';

export interface UseCheckAlertAttachmentsProps {
  cases: Pick<CaseUI, 'id'>[];
  getAttachments?: GetAttachments;
}

function hasAlertId<T>(arg: T): arg is T & { alertId: string[] | string } {
  const candidate = arg as unknown;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'alertId' in candidate &&
    (Array.isArray(candidate.alertId) || typeof candidate.alertId === 'string')
  );
}

export const useCheckAlertAttachments = ({
  cases,
  getAttachments,
}: UseCheckAlertAttachmentsProps): { disabledCases: Set<string>; isLoading: boolean } => {
  const selectedAlerts = (getAttachments?.({ theCase: undefined }) ?? [])
    .filter(hasAlertId)
    .map(({ alertId }) => alertId)
    .flatMap((arrayOrString) => arrayOrString);

  const { data, isFetching } = useFindCasesContainingAllSelectedAlerts(
    selectedAlerts,
    cases.map(({ id }) => id)
  );

  const disabledCases = useMemo(() => new Set(data?.casesWithAllAttachments ?? []), [data]);

  return { disabledCases, isLoading: isFetching };
};

export type UseCheckAlertAttachments = ReturnType<typeof useCheckAlertAttachments>;
