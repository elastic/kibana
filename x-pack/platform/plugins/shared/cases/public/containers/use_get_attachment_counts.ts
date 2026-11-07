/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { INTERNAL_ATTACHMENT_COUNTS_URL } from '../../common/constants';
import { KibanaServices } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';

export const getAttachmentCounts = async ({
  caseIds,
  attachmentType,
  signal,
}: {
  caseIds: string[];
  attachmentType: string;
  signal?: AbortSignal;
}): Promise<Record<string, number>> => {
  const { counts } = await KibanaServices.get().http.post<{ counts: Record<string, number> }>(
    INTERNAL_ATTACHMENT_COUNTS_URL,
    { body: JSON.stringify({ case_ids: caseIds, type: attachmentType }), signal }
  );
  return counts;
};

/** One batched count of an attachment type for the cases on the current list page. */
export const useGetAttachmentCounts = ({
  caseIds,
  attachmentType,
  enabled,
}: {
  caseIds: string[];
  attachmentType: string;
  enabled: boolean;
}) =>
  useQuery({
    queryKey: [...casesQueriesKeys.casesList(), 'attachment-counts', attachmentType, caseIds],
    queryFn: ({ signal }) => getAttachmentCounts({ caseIds, attachmentType, signal }),
    enabled: enabled && caseIds.length > 0,
    staleTime: 30_000,
  });
