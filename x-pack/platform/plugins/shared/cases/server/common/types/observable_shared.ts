/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './user';

/** Free-form key/value pairs a user sets on an observable value. */
export type ObservableMetadata = Record<string, string>;

/**
 * Attributes of a `cases-observable-shared` saved object: what is true of one observable value
 * (owner, type key and value) in every case of a space.
 */
export interface ObservableSharedPersistedAttributes {
  owner: string;
  type_key: string;
  value: string;
  metadata: ObservableMetadata;
  created_at: string;
  created_by: User;
  updated_at: string | null;
  updated_by: User | null;
}
