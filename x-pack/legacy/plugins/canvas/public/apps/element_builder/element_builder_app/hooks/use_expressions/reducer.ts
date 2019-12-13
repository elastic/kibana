/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionsAction, ExpressionsActions } from './actions';
import { State } from './index';

export const reducer = (prevState: State, action: ExpressionsAction) => {
  switch (action.type) {
    case ExpressionsActions.SET_EXPRESSION: {
      const { expression } = action.payload;

      return {
        ...prevState,
        expression,
      };
    }
    case ExpressionsActions.SET_AST: {
      const { ast } = action.payload;

      return {
        ...prevState,
        ast,
      };
    }
    case ExpressionsActions.SET_RESULT: {
      const { result } = action.payload;

      if (result.type === 'error' || result.type === 'null') {
        return {
          ...prevState,
          result: null,
        };
      }

      return {
        ...prevState,
        result,
      };
    }

    default: {
      return prevState;
    }
  }
};
