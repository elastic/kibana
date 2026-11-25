/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User } from './user';

/** Attributes of a `cases-observables` saved object: one observable of one case. */
export interface ObservablePersistedAttributes {
  /** The owner of the observable's case, such as `securitySolution`. */
  owner: string;
  /**
   * The observable type: a built-in key such as `observable-type-ipv4`, or the key of a custom
   * type defined in the Cases settings.
   */
  type_key: string;
  /** The observed value, such as an IP address or a host name. */
  value: string;
  /** Free-text notes about the observable, or `null` when there are none. */
  description: string | null;
  /**
   * The alert or event attachment the observable was extracted from, or `null` when it was added
   * by hand or its source wasn't recorded.
   */
  source_attachment_id: string | null;
  /** When the observable was added to the case, as an ISO 8601 timestamp. */
  created_at: string;
  /** The user who added the observable. */
  created_by: User;
  /** When the observable was last edited, or `null` if it never was. */
  updated_at: string | null;
  /** The user who last edited the observable, or `null` if it never was. */
  updated_by: User | null;
}
