/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CaseUI } from './types';
import { type GetAttachments } from '../components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useFindCasesContainingAllSelectedDocuments } from './use_find_cases_containing_all_selected_alerts';

export interface UseCheckAlertAttachmentsProps {
  cases: Pick<CaseUI, 'id'>[];
  getAttachments?: GetAttachments;
}

function hasDocumentId<T>(
  arg: T
): arg is T & { alertId?: string[] | string; eventId?: string | string[] } {
  const candidate = arg as unknown;

  if (candidate === null || typeof candidate !== 'object') {
    return false;
  }

  const hasAlertId =
    'alertId' in candidate &&
    (Array.isArray(candidate.alertId) || typeof candidate.alertId === 'string');

  const hasEventId =
    'eventId' in candidate &&
    (Array.isArray(candidate.eventId) || typeof candidate.eventId === 'string');

  return hasAlertId || hasEventId;
}

export const useCheckDocumentAttachments = ({
  cases,
  getAttachments,
}: UseCheckAlertAttachmentsProps): { disabledCases: Set<string>; isLoading: boolean } => {
  const selectedDocuments = (getAttachments?.({ theCase: undefined }) ?? [])
    .filter(hasDocumentId)
    .map(({ alertId, eventId }) => [alertId, eventId])
    .flatMap((arrayOrString) => arrayOrString)
    .filter(Boolean) as string[];

  const { data, isFetching } = useFindCasesContainingAllSelectedDocuments(
    selectedDocuments,
    cases.map(({ id }) => id)
  );

  const disabledCases = useMemo(() => new Set(data?.casesWithAllAttachments ?? []), [data]);

  return { disabledCases, isLoading: isFetching };
};

export type UseCheckDocumentAttachments = ReturnType<typeof useCheckDocumentAttachments>;
