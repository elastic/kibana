/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hello from './hello.json';
import austin from './austin.json';
import test from './test.json';

export * from './utils';
export type SnapshotNames = 'hello' | 'austin' | 'test';
export const snapshots = { hello, austin, test };
