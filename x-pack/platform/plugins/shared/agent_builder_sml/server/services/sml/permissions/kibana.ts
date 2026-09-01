/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlPermissionsInput } from '../types';

/**
 * Returns the `SmlPermissionsInput` for an SML type.
 *
 * Centralised so all SML types derive the same `ai_index:<kiType>/read` action and a future
 * permission-model change only needs one update. `kiType` MUST match the KI type the owning
 * feature declares in `aiIndex: { read: [...] }` — a mismatch produces an action no feature
 * privilege ever grants, silently hiding every entry of the type from every user.
 *
 * One kiType yields one action. A type needing several actions can return them directly from
 * `getPermissions` (`name` is a list); the caller must then hold ALL of them in a single space.
 */
export const kibanaPermissions = ({ kiType }: { kiType: string }): SmlPermissionsInput => {
  if (!kiType) {
    throw new Error('kibanaPermissions: kiType is required');
  }
  return {
    kibana: { privileges: { name: [`ai_index:${kiType}/read`] } },
  };
};
