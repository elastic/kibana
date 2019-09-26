/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IReference } from './textmodel_resolver';

export class ImmortalReference<T> implements IReference<T> {
  constructor(public object: T) {}
  public dispose(): void {
    /* noop */
  }
}
