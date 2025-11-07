/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class TaskAlreadyRunningError extends Error {
  constructor(id: string, noForce: boolean = false) {
    super(
      `Failed to run task "${id}" as it is currently running${
        noForce ? ' and cannot be forced' : ''
      }`
    );
  }
}
