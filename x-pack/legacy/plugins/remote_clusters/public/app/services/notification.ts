/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let toasts: any;
export let fatalError: any;

export function init(_toasts: any, _fatalError: any): void {
  toasts = _toasts;
  fatalError = _fatalError;
}
