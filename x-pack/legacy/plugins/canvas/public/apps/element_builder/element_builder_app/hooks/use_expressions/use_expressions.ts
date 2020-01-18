/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, Ast } from '@kbn/interpreter/target/common';

import {
  InterpreterResult,
  InterpreterError,
  isInterpreterResult,
} from '../../../../../../../../../../src/plugins/expressions/public';
import { getInterpretAst } from '../../lib/interpreter';
import { getFunctions } from '../../lib/functions';

import { createUseContext } from '../../lib/create_use_context';

import {
  setExpression as setExpressionAction,
  setExpressionAst,
  setExpressionDebug,
  setExpressionResult,
  initialState,
  reducer,
} from './store';

const { Provider, useRead, useActions } = createUseContext(reducer, initialState, 'Expressions');

export const ExpressionsProvider = Provider;
export const useExpressions = useRead;

export const useExpressionsActions = () => {
  const dispatch = useActions();
  const interpretAst = getInterpretAst(getFunctions());

  const setExpression = (value: string) => {
    let ast: Ast | null = null;
    let result: InterpreterResult | InterpreterError | null = null;

    dispatch(setExpressionAction(value));

    try {
      ast = fromExpression(value);
      dispatch(setExpressionAst(ast));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('error', e);
      dispatch(setExpressionAst(null));
      dispatch(setExpressionResult(null));
    }

    const runInterpreter = async () => {
      if (!ast) {
        dispatch(setExpressionResult(null));
        return;
      }

      try {
        result = await interpretAst(ast as Ast);
        dispatch(setExpressionDebug(result));
        if (isInterpreterResult(result)) {
          dispatch(setExpressionResult(result.out));
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('error', e);
        dispatch(setExpressionResult(null));
      }
    };

    runInterpreter();
  };

  return {
    setExpression,
  };
};
