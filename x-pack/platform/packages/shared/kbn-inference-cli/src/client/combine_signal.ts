/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function combineSignal(left: AbortSignal, right?: AbortSignal) {
  if (!right) {
    return left;
  }
  const controller = new AbortController();

  left.addEventListener('abort', () => {
    controller.abort();
  });
  right?.addEventListener('abort', () => {
    controller.abort();
  });

  return controller.signal;
}
