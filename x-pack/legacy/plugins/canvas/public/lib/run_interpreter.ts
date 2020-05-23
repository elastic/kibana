/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, getType } from '@kbn/interpreter/common';
import { ExpressionValue, ExpressionAstExpression } from 'src/plugins/expressions/public';
import { notifyService } from '../services';

import { CanvasStartDeps, CanvasSetupDeps } from '../plugin';

let expressionsStarting: Promise<CanvasStartDeps['expressions']> | undefined;

export const initInterpreter = function(
  expressionsStart: CanvasStartDeps['expressions'],
  expressionsSetup: CanvasSetupDeps['expressions']
) {
  expressionsStarting = startExpressions(expressionsStart, expressionsSetup);

  return expressionsStarting;
};

async function startExpressions(
  expressionsStart: CanvasStartDeps['expressions'],
  expressionsSetup: CanvasSetupDeps['expressions']
) {
  await expressionsSetup.__LEGACY.loadLegacyServerFunctionWrappers();
  return expressionsStart;
}

export const resetInterpreter = function() {
  expressionsStarting = undefined;
};

interface Options {
  castToRender?: boolean;
}

/**
 * Meant to be a replacement for plugins/interpreter/interpretAST
 */
export async function interpretAst(ast: ExpressionAstExpression): Promise<ExpressionValue> {
  if (!expressionsStarting) {
    throw new Error('Interpreter has not been initialized');
  }

  const expressions = await expressionsStarting;
  return await expressions.execute(ast).getData();
}

/**
 * Runs interpreter, usually in the browser
 *
 * @param {object} ast - Executable AST
 * @param {any} input - Initial input for AST execution
 * @param {object} options
 * @param {boolean} options.castToRender - try to cast to a type: render object?
 * @returns {promise}
 */
export async function runInterpreter(
  ast: ExpressionAstExpression,
  input: ExpressionValue,
  options: Options = {}
): Promise<ExpressionValue> {
  if (!expressionsStarting) {
    throw new Error('Interpreter has not been initialized');
  }

  const expressions = await expressionsStarting;

  try {
    const renderable = await expressions.execute(ast, input).getData();

    if (getType(renderable) === 'render') {
      return renderable;
    }

    if (options.castToRender) {
      return runInterpreter(fromExpression('render'), renderable, {
        castToRender: false,
      });
    }

    throw new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
  } catch (err) {
    notifyService.getService().error(err);
    throw err;
  }
}
