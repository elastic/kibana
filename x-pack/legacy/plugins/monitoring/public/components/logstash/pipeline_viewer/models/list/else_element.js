/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Element } from './element';

export class ElseElement extends Element {
  constructor(statement, depth, parentId) {
    const { id } = statement;
    super(`${id}_else`, statement, depth, parentId);
  }
}
