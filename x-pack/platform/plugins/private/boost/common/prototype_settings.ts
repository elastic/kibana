/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prototype-only switches in the prototype menu. They're shared by everyone testing the prototype,
 * and "Restore prototype defaults" turns them back off.
 */
export interface PrototypeSettings {
  /** Whether to show search cost and VCU estimates, which aren't planned for the initial release. */
  shows_estimates: boolean;
  /**
   * Whether deleting the first custom rule, by name, that uses each profile fails, as a request to
   * Elasticsearch can, so deleting a profile with its rules partly fails.
   */
  fails_rule_deletes: boolean;
  /** Whether deleting a custom profile fails, as a request to Elasticsearch can. */
  fails_profile_deletes: boolean;
}

export const DEFAULT_PROTOTYPE_SETTINGS: Readonly<PrototypeSettings> = {
  shows_estimates: false,
  fails_rule_deletes: false,
  fails_profile_deletes: false,
};
