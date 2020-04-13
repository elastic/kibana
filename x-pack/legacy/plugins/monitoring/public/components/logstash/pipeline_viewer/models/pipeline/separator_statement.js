/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Statement } from './statement';

export class SeparatorStatement extends Statement {
  toList() {
    const list = [];

    return list;
  }

  static fromPipelineGraphVertex(separatorVertex) {
    return new SeparatorStatement(separatorVertex);
  }
}
