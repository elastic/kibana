/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlPermissions } from '../types';

/**
 * Build the {@link SmlPermissions} an SML type should stamp on chunks backed
 * by a Kibana saved object.
 *
 * The standard read privilege the Saved Objects API enforces for a single
 * SO type is `saved_object:<type>/get`. Centralising it here means SO-backed
 * SML types (visualization, dashboard, …) never hand-write the privilege
 * string and a future SO permission-model change only needs to be applied
 * in one place.
 *
 * Usage from an SML type definition:
 *
 *   export const visualizationSmlType: SmlTypeDefinition = {
 *     id: 'visualization',
 *     // ...
 *     getPermissions: () =>
 *       kibanaSavedObjectPermissions({ savedObjectType: 'lens' }),
 *   };
 *
 * The returned object always has fully-shaped inner arrays (the SML mapping
 * requires both `kibana.privileges` and `elasticsearch.indices` to exist on
 * the document); the `elasticsearch` side is intentionally empty because SO
 * reads are gated by Kibana feature privileges, not ES indices.
 *
 * Each invocation returns a fresh object so the caller can safely mutate
 * its inner arrays (e.g. push extra privileges) without aliasing across
 * call sites.
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
