/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Vertex } from './vertex';

export class SeparatorVertex extends Vertex {
  get typeString() {
    return 'separator';
  }

  get title() {
    return 'separator';
  }

  get iconType() {
    return '';
  }

  get next() {
    return this.outgoingVertices;
  }
}
