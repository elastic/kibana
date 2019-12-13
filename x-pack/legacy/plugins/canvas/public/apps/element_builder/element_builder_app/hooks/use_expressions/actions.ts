/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/target/common';

import { createActionFactory } from '../hookstore';

export enum ExpressionsActions {
  SET_EXPRESSION = 'SET_EXPRESSION',
  SET_AST = 'SET_AST',
  SET_RESULT = 'SET_RESULT',
}

const createAction = createActionFactory<ExpressionsActions>();

const setExpression = (expression: string) =>
  createAction(ExpressionsActions.SET_EXPRESSION, { expression });

const setExpressionAst = (ast: Ast | null) => createAction(ExpressionsActions.SET_AST, { ast });

const setExpressionResult = (result: Ast | null) =>
  createAction(ExpressionsActions.SET_RESULT, { result });

export const actions = {
  setExpression,
  setExpressionAst,
  setExpressionResult,
};

export type ExpressionsAction = ReturnType<typeof actions[keyof typeof actions]>;
