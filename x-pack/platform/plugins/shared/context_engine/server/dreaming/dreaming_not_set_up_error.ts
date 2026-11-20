/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class DreamingNotSetUpError extends Error {
  constructor(aiIndexId: string) {
    super(
      `Dreaming is not set up for AI index '${aiIndexId}'. Turn dreaming on and configure at least one fact or entity type.`
    );
    this.name = 'DreamingNotSetUpError';
  }
}
