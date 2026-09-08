/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../common/domain/definitions/entity_schema';

/** Raised when a per entity-type config override targets a type that has no installed engine. */
export class EntityTypeNotInstalledError extends Error {
  constructor(public readonly entityTypes: EntityType[]) {
    super(
      `No installed engine for entity type(s): ${entityTypes.join(
        ', '
      )}. Install them first via POST /api/security/entity_store/install, then retry.`
    );
  }
}
