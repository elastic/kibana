/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ForgetMode = 'tombstone' | 'hard_delete';

export type ForgetOutcome = 'forgotten' | 'already_forgotten' | 'not_found';

export type HardDeleteOutcome = 'deleted' | 'not_found';

export type ForgetSessionMemoriesResponse =
  | { mode: 'tombstone'; results: Array<{ id: string; outcome: ForgetOutcome }> }
  | { mode: 'hard_delete'; results: Array<{ id: string; outcome: HardDeleteOutcome }> };
