/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { findCasesByAttachmentId } from './api';

// deterministically create the same key for repeat requests
const normalizeQueryKey = (selectedAlertIds: string[], caseIds: string[]) =>
  [...new Set([...selectedAlertIds, ...caseIds])].sort();

export const useFindCasesContainingAllSelectedDocuments = (
  selectedDocumentIds: string[],
  caseIds: string[]
) => {
  return useQuery<
    { casesWithAllAttachments: string[] },
    Error,
    { casesWithAllAttachments?: string[] },
    readonly string[]
  >(
    normalizeQueryKey(selectedDocumentIds, caseIds),
    () => findCasesByAttachmentId(selectedDocumentIds, caseIds),
    {
      enabled: selectedDocumentIds.length > 0 && caseIds.length > 0,
    }
  );
};
