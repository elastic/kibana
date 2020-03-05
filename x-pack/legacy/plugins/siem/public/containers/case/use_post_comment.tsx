/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { CommentRequest } from '../../../../../../plugins/case/common/api';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';

import { postComment } from './api';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS } from './constants';
import * as i18n from './translations';
import { Comment } from './types';

interface NewCommentState {
  commentData: Comment | null;
  isLoading: boolean;
  isError: boolean;
  caseId: string;
}
interface Action {
  type: string;
  payload?: Comment;
}

const dataFetchReducer = (state: NewCommentState, action: Action): NewCommentState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case FETCH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isError: false,
        commentData: action.payload ?? null,
      };
    case FETCH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      throw new Error();
  }
};

interface UsePostComment extends NewCommentState {
  postComment: (data: CommentRequest) => void;
}

export const usePostComment = (caseId: string): UsePostComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    commentData: null,
    isLoading: false,
    isError: false,
    caseId,
  });
  const [, dispatchToaster] = useStateToaster();

  const postMyComment = useCallback(async (data: CommentRequest) => {
    let cancel = false;
    try {
      dispatch({ type: FETCH_INIT });
      const response = await postComment(data, state.caseId);
      if (!cancel) {
        dispatch({ type: FETCH_SUCCESS, payload: response });
      }
    } catch (error) {
      if (!cancel) {
        errorToToaster({
          title: i18n.ERROR_TITLE,
          error: error.body && error.body.message ? new Error(error.body.message) : error,
          dispatchToaster,
        });
        dispatch({ type: FETCH_FAILURE });
      }
    }
    return () => {
      cancel = true;
    };
  }, []);

  return { ...state, postComment: postMyComment };
};
