/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS } from './constants';
import { Comment } from './types';
import { updateComment } from './api';
import { getTypedPayload } from './utils';

interface CommetUpdateState {
  data: Comment[];
  isLoading: boolean;
  isError: boolean;
  isLoadingCommentId: string | null;
}

interface CommentUpdate {
  update: Partial<Comment>;
  commentId: string;
}

interface Action {
  type: string;
  payload?: CommentUpdate | string;
}

const dataFetchReducer = (state: CommetUpdateState, action: Action): CommetUpdateState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
        isLoadingCommentId: getTypedPayload<string>(action.payload),
      };

    case FETCH_SUCCESS:
      const updatePayload = getTypedPayload<CommentUpdate>(action.payload);
      const foundIndex = state.data.findIndex(
        comment => comment.commentId === updatePayload.commentId
      );
      state.data[foundIndex] = { ...state.data[foundIndex], ...updatePayload.update };
      return {
        ...state,
        isLoading: false,
        isLoadingCommentId: null,
        isError: false,
        data: [...state.data],
      };
    case FETCH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isLoadingCommentId: null,
        isError: true,
      };
    default:
      throw new Error();
  }
};

export const useUpdateComment = (
  comments: Comment[]
): [CommetUpdateState, (commentId: string, commentUpdate: string) => void] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isLoadingCommentId: null,
    isError: false,
    data: comments,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateComment = async (commentId: string, commentUpdate: string) => {
    dispatch({ type: FETCH_INIT, payload: commentId });
    try {
      const currentComment = state.data.find(comment => comment.commentId === commentId) ?? {
        version: '',
      };
      const response = await updateComment(commentId, commentUpdate, currentComment.version);
      dispatch({ type: FETCH_SUCCESS, payload: { update: response, commentId } });
    } catch (error) {
      errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
      dispatch({ type: FETCH_FAILURE });
    }
  };

  return [state, dispatchUpdateComment];
};
