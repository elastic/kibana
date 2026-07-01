/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlPermissions } from '../types';

/**
 * Returns the `SmlPermissions` for a saved-object-backed SML type.
 * Centralised so all SO types use the same `saved_object:<type>/get` privilege
 * string and a future SO permission-model change only needs one update.
 */
export const kibanaSavedObjectPermissions = ({
  savedObjectType,
}: {
  savedObjectType: string;
}): SmlPermissions => {
  if (!savedObjectType) {
    throw new Error('kibanaSavedObjectPermissions: savedObjectType is required');
  }
  return {
    kibana: { privileges: [{ name: `saved_object:${savedObjectType}/get` }] },
    elasticsearch: { indices: [] },
  };
};
