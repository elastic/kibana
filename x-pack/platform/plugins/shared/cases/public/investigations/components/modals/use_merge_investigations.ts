/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { MergeRecordRequest } from '../../../../common/investigations/types';
import { mergeRecord } from '../../api/client';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationsServices } from '../../services';

/**
 * Merges two investigations. Unlike `useMergeRecord` it shows no toast of its own: the modal
 * reports what moved, and shows the server message when the merge is refused.
 */
export const useMergeInvestigations = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();

  return useMutation((body: MergeRecordRequest) => mergeRecord(http, recordId, body), {
    onSuccess: () => {
      void queryClient.invalidateQueries(investigationKeys.all);
    },
  });
};
