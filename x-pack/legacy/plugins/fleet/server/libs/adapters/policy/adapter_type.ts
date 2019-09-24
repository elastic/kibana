/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FullPolicyFile as BaseFullPolicyFile } from '../../../../../ingest/server/libs/adapters/policy/adapter_types';

export type FullPolicyFile = BaseFullPolicyFile;

export interface IngestPlugin {
  getFull(id: string): Promise<FullPolicyFile>;
}

export interface PolicyAdapter {
  getFullPolicy(id: string): Promise<FullPolicyFile>;
}
