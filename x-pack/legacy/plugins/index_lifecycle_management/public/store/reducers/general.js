/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { setIndexName, setAliasName, setBootstrapEnabled } from '../actions/general';

const defaultState = {
  bootstrapEnabled: false,
  indexName: '',
  aliasName: '',
};

export const general = handleActions(
  {
    [setIndexName](state, { payload: indexName }) {
      return {
        ...state,
        indexName,
      };
    },
    [setAliasName](state, { payload: aliasName }) {
      return {
        ...state,
        aliasName,
      };
    },
    [setBootstrapEnabled](state, { payload: bootstrapEnabled }) {
      return {
        ...state,
        bootstrapEnabled,
      };
    },
  },
  defaultState
);
