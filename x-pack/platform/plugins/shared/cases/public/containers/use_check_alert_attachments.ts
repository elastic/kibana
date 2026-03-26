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

interface DocumentReference {
  alertId?: string[] | string;
  eventId?: string | string[];
  externalReferenceId?: string | string[];
}

export const hasDocReferences = <T>(arg: T): arg is T & DocumentReference => {
  if (arg === null || typeof arg !== 'object') {
    return false;
  }

  const candidate = arg as DocumentReference;
  const idFields = ['alertId', 'eventId', 'externalReferenceId'] as const;

  for (const fieldName of idFields) {
    if (
      fieldName in candidate &&
      (Array.isArray(candidate[fieldName]) || typeof candidate[fieldName] === 'string')
    ) {
      return true;
    }
  }

  return false;
};

export const useCheckDocumentAttachments = ({
  cases,
  getAttachments,
}: UseCheckAlertAttachmentsProps): { disabledCases: Set<string>; isLoading: boolean } => {
  const selectedDocumentIds = (getAttachments?.({ theCase: undefined }) ?? [])
    .filter(hasDocReferences)
    .flatMap(({ alertId, eventId, externalReferenceId }) =>
      [alertId, eventId, externalReferenceId].flat()
    )
    .filter(
      (reference): reference is string => typeof reference === 'string' && reference.length > 0
    );

  const { data, isFetching } = useFindCasesContainingAllSelectedDocuments(
    selectedDocumentIds,
    cases.map(({ id }) => id)
  );

  const disabledCases = useMemo(() => new Set(data?.casesWithAllAttachments ?? []), [data]);

  return { disabledCases, isLoading: isFetching };
};

export type UseCheckDocumentAttachments = ReturnType<typeof useCheckDocumentAttachments>;
