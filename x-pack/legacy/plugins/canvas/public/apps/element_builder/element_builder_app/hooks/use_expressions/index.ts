/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { Ast, fromExpression } from '@kbn/interpreter/target/common';

import { getInterpretAst } from '../../lib/interpreter';
import { getFunctionDefinitions } from '../../lib/functions';
import { createStore, useStore } from '../hookstore';
import { reducer } from './reducer';
import { actions } from './actions';

export interface State {
  expression: string;
  ast: Ast | null;
  result: Ast | null;
}

const initialState: State = {
  expression: '',
  ast: null,
  result: null,
};

const store = createStore(initialState, reducer);

export const useExpressions = () => {
  const { state } = useStore(store);
  return state;
};

export const useExpressionsActions = () => {
  const { state, dispatch } = useStore(store);
  const interpretAst = getInterpretAst(getFunctionDefinitions());
  const [expression, setExpression] = useState('');
  const [ast, setAst] = useState<Ast | null>(null);
  const [result, setResult] = useState<Ast | null>(null);

  useEffect(() => {
    dispatch(actions.setExpression(expression));
    try {
      console.log('expression updated', expression);
      setAst(fromExpression(expression));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('error', e);
      setAst(null);
      setResult(null);
    }
  }, [expression]);

  useEffect(() => {
    if (!ast) {
      return;
    }

    dispatch(actions.setExpressionAst(ast));

    const runInterpreter = async () => {
      try {
        console.log('ast', ast);
        const resultValue = await interpretAst(ast);
        setResult(resultValue);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('error', e);
        setResult(null);
      }
    };

    runInterpreter();
  }, [ast]);

  useEffect(() => {
    if (!result) {
      return;
    }
    console.log('result', result);

    dispatch(actions.setExpressionResult(result));
  }, [result]);

  return { state, setExpression };
};
