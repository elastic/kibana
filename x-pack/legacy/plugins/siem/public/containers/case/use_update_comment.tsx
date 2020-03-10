/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback, Dispatch } from 'react';

import { errorToToaster, useStateToaster } from '../../components/toasters';

import { patchComment } from './api';
import * as i18n from './translations';
import { Comment } from './types';

interface CommentUpdateState {
  comments: Comment[];
  isLoadingIds: string[];
  isError: boolean;
}

interface CommentUpdate {
  update: Partial<Comment>;
  commentId: string;
}

type Action =
  | { type: 'APPEND_COMMENT'; payload: Comment }
  | { type: 'FETCH_INIT'; payload: string }
  | { type: 'FETCH_SUCCESS'; payload: CommentUpdate }
  | { type: 'FETCH_FAILURE'; payload: string };

const dataFetchReducer = (state: CommentUpdateState, action: Action): CommentUpdateState => {
  switch (action.type) {
    case 'APPEND_COMMENT':
      return {
        ...state,
        comments: [...state.comments, action.payload],
      };
    case 'FETCH_INIT':
      return {
        ...state,
        isLoadingIds: [...state.isLoadingIds, action.payload],
        isError: false,
      };

    case 'FETCH_SUCCESS':
      const updatePayload = action.payload;
      const foundIndex = state.comments.findIndex(
        comment => comment.id === updatePayload.commentId
      );
      const newComments = state.comments;
      if (foundIndex !== -1) {
        newComments[foundIndex] = { ...state.comments[foundIndex], ...updatePayload.update };
      }

      return {
        ...state,
        isLoadingIds: state.isLoadingIds.filter(id => updatePayload.commentId !== id),
        isError: false,
        comments: newComments,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoadingIds: state.isLoadingIds.filter(id => action.payload !== id),
        isError: true,
      };
    default:
      throw new Error();
  }
};

interface UseUpdateComment extends CommentUpdateState {
  updateComment: (caseId: string, commentId: string, commentUpdate: string) => void;
  addPostedComment: Dispatch<Comment>;
}

export const useUpdateComment = (comments: Comment[]): UseUpdateComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoadingIds: [],
    isError: false,
    comments,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateComment = useCallback(
    async (caseId: string, commentId: string, commentUpdate: string) => {
      let cancel = false;
      try {
        dispatch({ type: 'FETCH_INIT', payload: commentId });
        const currentComment = state.comments.find(comment => comment.id === commentId) ?? {
          version: '',
        };
        const response = await patchComment(
          caseId,
          commentId,
          commentUpdate,
          currentComment.version
        );
        if (!cancel) {
          dispatch({ type: 'FETCH_SUCCESS', payload: { update: response, commentId } });
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE', payload: commentId });
        }
      }
      return () => {
        cancel = true;
      };
    },
    [state]
  );
  const addPostedComment = useCallback(
    (comment: Comment) => dispatch({ type: 'APPEND_COMMENT', payload: comment }),
    []
  );

  return { ...state, updateComment: dispatchUpdateComment, addPostedComment };
};
