/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useCasesToast } from '../../common/use_cases_toast';
import type { ServerError } from '../../types';
import { casesMutationsKeys, casesQueriesKeys } from '../constants';
import { ERROR_TITLE } from '../translations';
import { getReplies, getReplyCounts, postReply } from './api';

/** Reply counts of every comment of a case; shared by all comment rows. */
export const useGetReplyCounts = (caseId: string) =>
  useQuery(casesQueriesKeys.replyCounts(caseId), ({ signal }) => getReplyCounts(caseId, signal), {
    staleTime: Infinity,
  });

export const useGetReplies = ({
  caseId,
  parentId,
  isEnabled,
}: {
  caseId: string;
  parentId: string;
  isEnabled: boolean;
}) => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.replies(caseId, parentId),
    ({ signal }) => getReplies(caseId, parentId, signal),
    {
      enabled: isEnabled,
      onError: (error: ServerError) => showErrorToast(error, { title: ERROR_TITLE }),
    }
  );
};

export const usePostReply = () => {
  const queryClient = useQueryClient();
  const { showErrorToast } = useCasesToast();

  return useMutation(postReply, {
    mutationKey: casesMutationsKeys.postReply,
    onSuccess: (_, { caseId, parentId }) => {
      queryClient.invalidateQueries(casesQueriesKeys.replies(caseId, parentId));
      queryClient.invalidateQueries(casesQueriesKeys.replyCounts(caseId));
    },
    onError: (error: ServerError) => showErrorToast(error, { title: ERROR_TITLE }),
  });
};
