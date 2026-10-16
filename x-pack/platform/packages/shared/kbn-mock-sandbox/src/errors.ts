/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown by a backend when a conversation's sandbox is gone; mapped to gRPC UNAVAILABLE. */
export class SandboxUnavailableError extends Error {}
