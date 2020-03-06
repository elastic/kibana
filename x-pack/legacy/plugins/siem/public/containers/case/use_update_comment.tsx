/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';

import { patchComment } from './api';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS } from './constants';
import * as i18n from './translations';
import { Comment } from './types';
import { getTypedPayload } from './utils';

interface CommentUpdateState {
  comments: Comment[];
  isLoadingIds: string[];
  isError: boolean;
}

interface CommentUpdate {
  update: Partial<Comment>;
  commentId: string;
}

interface Action {
  type: string;
  payload?: CommentUpdate | string;
}

const dataFetchReducer = (state: CommentUpdateState, action: Action): CommentUpdateState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoadingIds: [...state.isLoadingIds, getTypedPayload<string>(action.payload)],
        isError: false,
      };

    case FETCH_SUCCESS:
      const updatePayload = getTypedPayload<CommentUpdate>(action.payload);
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
    case FETCH_FAILURE:
      return {
        ...state,
        isLoadingIds: state.isLoadingIds.filter(
          id => getTypedPayload<string>(action.payload) !== id
        ),
        isError: true,
      };
    default:
      throw new Error();
  }
};

interface UseUpdateComment extends CommentUpdateState {
  updateComment: (commentId: string, commentUpdate: string) => void;
}

export const useUpdateComment = (comments: Comment[]): UseUpdateComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoadingIds: [],
    isError: false,
    comments,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateComment = useCallback(
    async (commentId: string, commentUpdate: string) => {
      let cancel = false;
      try {
        dispatch({ type: FETCH_INIT, payload: commentId });
        const currentComment = state.comments.find(comment => comment.id === commentId) ?? {
          version: '',
        };
        const response = await patchComment(commentId, commentUpdate, currentComment.version);
        if (!cancel) {
          dispatch({ type: FETCH_SUCCESS, payload: { update: response, commentId } });
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: FETCH_FAILURE, payload: commentId });
        }
      }
      return () => {
        cancel = true;
      };
    },
    [state]
  );

  return { ...state, updateComment: dispatchUpdateComment };
};
