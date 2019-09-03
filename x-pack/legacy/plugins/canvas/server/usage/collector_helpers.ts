/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * @param ast: an ast that includes functions to track
 * @param cb: callback to do something with a function that has been found
 */

import { ExpressionAST, ExpressionArgAST } from '../../types';

function isExpression(maybeExpression: ExpressionArgAST): maybeExpression is ExpressionAST {
  return typeof maybeExpression === 'object';
}

export function collectFns(ast: ExpressionArgAST, cb: (functionName: string) => void) {
  if (isExpression(ast)) {
    ast.chain.forEach(({ function: cFunction, arguments: cArguments }) => {
      cb(cFunction);

      // recurse the arguments and update the set along the way
      Object.keys(cArguments).forEach(argName => {
        cArguments[argName].forEach(subAst => {
          if (subAst != null) {
            collectFns(subAst, cb);
          }
        });
      });
    });
  }
}
