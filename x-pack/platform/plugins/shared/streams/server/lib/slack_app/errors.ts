/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when the Slack App surface is not configured/available on this deployment. */
export class SlackAppUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlackAppUnavailableError';
  }
}
