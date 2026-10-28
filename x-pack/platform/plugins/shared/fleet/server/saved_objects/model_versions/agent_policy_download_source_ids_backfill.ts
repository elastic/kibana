/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../../common';

export const backfillAgentPolicyDownloadSourceIds: SavedObjectModelDataBackfillFn<
  AgentPolicy,
  AgentPolicy
> = (agentPolicyDoc) => {
  const { download_source_id, download_source_ids } = agentPolicyDoc.attributes;
  if (download_source_id && !download_source_ids?.length) {
    agentPolicyDoc.attributes.download_source_ids = [download_source_id];
  }
  return agentPolicyDoc;
};
