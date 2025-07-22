/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type FlyoutStep = 'initializing' | 'confirmReindex' | 'reindexing' | 'completed';
export type ModalStep =
  | 'initializing'
  | 'confirmReadonly'
  | 'confirmUnfreeze'
  | 'makeReadonly'
  | 'makeReadonlyRetry'
  | 'unfreeze'
  | 'unfreezeRetry'
  | 'completed'
  | 'confirmDelete'
  | 'delete';
