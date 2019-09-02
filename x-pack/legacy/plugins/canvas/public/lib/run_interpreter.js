/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromExpression, getType } from '@kbn/interpreter/common';
import { interpretAst } from 'plugins/interpreter/interpreter';
import { loadLegacyServerFunctionWrappers } from 'plugins/interpreter/canvas/load_legacy_server_function_wrappers';
import { notify } from './notify';

/**
 * Runs interpreter, usually in the browser
 *
 * @param {object} ast - Executable AST
 * @param {any} context - Initial context for AST execution
 * @param {object} options
 * @param {boolean} options.castToRender - try to cast to a type: render object?
 * @param {boolean} options.retryRenderCasting -
 * @returns {promise}
 */
export function runInterpreter(ast, context = null, options = {}) {
  return loadLegacyServerFunctionWrappers()
    .then(() => interpretAst(ast, context))
    .then(renderable => {
      if (getType(renderable) === 'render') {
        return renderable;
      }

      if (options.castToRender) {
        return runInterpreter(fromExpression('render'), renderable, {
          castToRender: false,
        });
      }

      return new Error(`Ack! I don't know how to render a '${getType(renderable)}'`);
    })
    .catch(err => {
      notify.error(err);
      throw err;
    });
}
