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
   * Whether a rule can select several indices or data streams. Elasticsearch takes one index pattern
   * per rule, so a rule selects one unless this is on.
   */
  allows_multiple_targets: boolean;
}

export const DEFAULT_PROTOTYPE_SETTINGS: Readonly<PrototypeSettings> = {
  shows_estimates: false,
  allows_multiple_targets: false,
};
