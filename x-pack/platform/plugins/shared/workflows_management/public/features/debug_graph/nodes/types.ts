/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type NodeType = 'if' | 'parallel' | 'action' | 'foreach' | 'atomic' | 'trigger';

export const mainScopeNodes = [
  'enter-if',
  'exit-if',
  'enter-foreach',
  'exit-foreach',
  'enter-retry',
  'exit-retry',
  'enter-continue',
  'exit-continue',
  'enter-try-block',
  'exit-try-block',
  'enter-timeout-zone',
  'exit-timeout-zone',
];
export const secondaryScopeNodes = [
  'enter-condition-branch',
  'exit-condition-branch',
  'enter-normal-path',
  'exit-normal-path',
  'enter-fallback-path',
  'exit-fallback-path',
];
export const atomicNodes = ['atomic', 'http', 'wait'];
