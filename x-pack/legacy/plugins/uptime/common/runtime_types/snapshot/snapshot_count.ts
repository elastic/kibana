/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const SnapshotType = t.type({
  down: t.number,
  mixed: t.number,
  total: t.number,
  up: t.number,
});

export type Snapshot = t.TypeOf<typeof SnapshotType>;
