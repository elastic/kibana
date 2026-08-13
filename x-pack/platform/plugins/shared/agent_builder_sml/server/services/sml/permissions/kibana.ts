/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlPermissionsInput } from '../types';

/**
 * Returns the `SmlPermissionsInput` for an SML type.
 * Centralised so all SML types use the same `ai_index:<type>/get` privilege
 * string and a future SML permission-model change only needs one update.
 */
export const kibanaPermissions = ({
  kiType,
}: {
  kiType: string;
}): SmlPermissionsInput => {
  if (!kiType) {
    throw new Error('kibanaPermissions: kiType is required');
  }
  return {
    kibana: { privileges: { name: `ai_index:${kiType}/get` } },
  };
};
