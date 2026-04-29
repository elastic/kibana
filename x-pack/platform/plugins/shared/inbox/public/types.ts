/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface InboxClientConfig {
  enabled: boolean;
}

export type InboxPublicSetup = Record<string, never>;
export type InboxPublicStart = Record<string, never>;

export type InboxSetupDependencies = Record<string, never>;
export type InboxStartDependencies = Record<string, never>;
