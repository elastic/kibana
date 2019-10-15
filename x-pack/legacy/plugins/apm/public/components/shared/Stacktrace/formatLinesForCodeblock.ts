/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { IStackframeWithLineContext } from '../../../../typings/es_schemas/raw/fields/Stackframe';

const formatLinesForCodeblock = (stackframe: IStackframeWithLineContext) => {
  const lineNumber = stackframe.line.number;

  const pre = idx(stackframe, _ => _.context.pre) || [];
  const post = idx(stackframe, _ => _.context.post) || [];
  const contexts = [...pre, stackframe.line.context, ...post];

  const start = lineNumber - pre.length;

  const lines = contexts.map((line, i) => ({
    lineNumber: (i + start).toString(),
    context: line
  }));

  return {
    highlightLine: (i: number) => i === pre.length,
    lineMapper: (i: number) => lines[i].lineNumber,
    lines
  };
};

export { formatLinesForCodeblock };
