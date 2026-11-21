/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { AddCommentRequest, UpdateCommentRequest } from '../../../common/investigations/types';
import { addComment, deleteComment, findComments, updateComment } from '../api/client';
import { investigationKeys } from '../api/query_keys';
import { useInvestigationsServices } from '../services';
import { getHttpErrorStatus } from './errors';
import { useInvestigationToasts } from './use_investigation_toasts';
import * as i18n from './translations';

const COMMENTS_PAGE_SIZE = 50;

/** Under the record scope, so the live poller and every record mutation refresh the discussion. */
const commentsKey = (recordId: string) =>
  [...investigationKeys.recordScope(recordId), 'comments'] as const;

/**
 * The discussion of a record: its Cases comments, newest page first. Each page is returned in the
 * server's descending order; reverse the flattened list to show the newest at the bottom.
 */
export const useComments = (recordId: string, options?: { enabled?: boolean }) => {
  const { http } = useInvestigationsServices();

  return useInfiniteQuery(
    commentsKey(recordId),
    ({ pageParam = 1 }: { pageParam?: number }) =>
      findComments(http, recordId, {
        page: pageParam,
        per_page: COMMENTS_PAGE_SIZE,
        sort_order: 'desc',
      }),
    {
      enabled: (options?.enabled ?? true) && recordId.length > 0,
      retry: false,
      getNextPageParam: (last) =>
        last.page * last.per_page < last.total ? last.page + 1 : undefined,
    }
  );
};

/** Comments change the record's history, so the whole record scope is refreshed. */
const useInvalidateRecord = (recordId: string) => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries(investigationKeys.recordScope(recordId));
    void queryClient.invalidateQueries(investigationKeys.findAll());
  };
};

export const useAddComment = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((body: AddCommentRequest) => addComment(http, recordId, body), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.ADD_COMMENT_ERROR),
  });
};

export type UpdateCommentVariables = UpdateCommentRequest & { commentId: string };

/** Fails with HTTP 409 when the comment changed since `version` was read; the caller explains it. */
export const useUpdateComment = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation(
    ({ commentId, ...body }: UpdateCommentVariables) =>
      updateComment(http, recordId, commentId, body),
    {
      onSuccess: invalidate,
      onError: (error) => {
        if (getHttpErrorStatus(error) !== 409) {
          showError(error, i18n.UPDATE_COMMENT_ERROR);
        }
        invalidate();
      },
    }
  );
};

export const useDeleteComment = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const invalidate = useInvalidateRecord(recordId);
  const { showError } = useInvestigationToasts();

  return useMutation((commentId: string) => deleteComment(http, recordId, commentId), {
    onSuccess: invalidate,
    onError: (error) => showError(error, i18n.DELETE_COMMENT_ERROR),
  });
};
