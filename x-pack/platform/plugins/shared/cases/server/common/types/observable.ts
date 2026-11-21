/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './user';

/** Attributes of a `cases-observables` saved object: one observable of one case. */
export interface ObservablePersistedAttributes {
  owner: string;
  type_key: string;
  value: string;
  description: string | null;
  source_attachment_id: string | null;
  created_at: string;
  created_by: User;
  updated_at: string | null;
  updated_by: User | null;
}
