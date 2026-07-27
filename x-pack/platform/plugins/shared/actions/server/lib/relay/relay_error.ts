/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  public get isTerminal(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
}
