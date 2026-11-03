/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown where a task would use something a task pod does not have, naming what it is. */
export class TaskPodUnsupportedError extends Error {
  constructor(
    what: string,
    why = 'a task pod has no route back to Kibana and no privileges service'
  ) {
    super(`${what} is not supported in a task pod: ${why}. Run this in Kibana.`);
    this.name = 'TaskPodUnsupportedError';
  }
}
