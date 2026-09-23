/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AiIndexNotReadableError extends Error {
  constructor(aiIndexId: string, reason: string) {
    super(
      `AI index '${aiIndexId}' is not readable: ${reason}. Reading it needs the Elasticsearch 'read' privilege on its backing indices.`
    );
    this.name = 'AiIndexNotReadableError';
  }
}
