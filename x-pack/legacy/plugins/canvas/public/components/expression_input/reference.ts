/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CanvasFunction, CanvasArgValue } from '../../../types';

/**
 * Given a function definition, this function returns a markdown string
 * that includes the context the function accepts, what the function returns
 * as well as the general help/documentation text associated with the function
 */
export function getFunctionReferenceStr(fnDef: CanvasFunction) {
  const { help, context, type } = fnDef;
  const doc = `**Accepts**: ${
    context && context.types ? context.types.join(' | ') : 'null'
  }, **Returns**: ${type ? type : 'null'}
\n\n${help}`;

  return doc;
}

/**
 * Given an argument defintion, this function returns a markdown string
 * that includes the aliases of the argument, types accepted for the argument,
 * the default value of the argument, whether or not its required, and
 * the general help/documentation text associated with the argument
 */
export function getArgReferenceStr(argDef: CanvasArgValue) {
  const { aliases, types, default: def, required, help } = argDef;

  const secondLineArr = [];

  if (def != null) {
    secondLineArr.push(`**Default**: ${def}`);
  }

  if (aliases && aliases.length) {
    secondLineArr.push(`**Aliases**: ${aliases.join(' | ')}`);
  }

  const ref = `**Types**: ${types && types.length ? types.join(' | ') : 'null'},
 **Required**: ${String(Boolean(required))}
\n\n${secondLineArr.join(', ')}
\n\n${help}`;

  return ref;
}
