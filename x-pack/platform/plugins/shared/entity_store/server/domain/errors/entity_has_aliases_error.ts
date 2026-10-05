/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class EntityHasAliasesError extends Error {
  constructor(entityId: string, aliasIds: string[]) {
    super(
      `Entity '${entityId}' has aliases [${aliasIds.join(
        ', '
      )}]. Unlink them first before linking this entity as an alias.`
    );
    this.name = 'EntityHasAliasesError';
  }
}
