/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when an operation runs on a client whose connection was never opened or has closed. */
export class McpNotConnectedError extends Error {
  constructor(name: string, version: string) {
    super(`MCP client not connected to ${name}, ${version}`);
    this.name = 'McpNotConnectedError';
  }
}
