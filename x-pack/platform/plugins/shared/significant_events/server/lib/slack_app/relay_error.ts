/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A non-2xx response from the Relay service. Carries the HTTP status so callers
 * can distinguish terminal failures (4xx: claim expired/consumed, workspace
 * already bound) from transient ones (5xx / network), and the Relay's own
 * `message` so it can be surfaced to the user instead of a generic error.
 */
export class RelayRequestError extends Error {
  constructor(
    path: string,
    public readonly statusCode: number,
    public readonly relayMessage?: string
  ) {
    super(
      `Relay request to ${path} failed with status ${statusCode}${
        relayMessage ? `: ${relayMessage}` : ''
      }`
    );
    this.name = 'RelayRequestError';
  }

  /** Terminal: retrying the same request cannot succeed (claim gone, already bound). */
  public get isTerminal(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
}
