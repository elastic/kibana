/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

export interface SeedSlmPolicy {
  policyName: string;
  snapshotName: string;
  schedule: string;
  repository: string;
  config?: {
    indices?: string | string[];
    ignoreUnavailable?: boolean;
  };
  retention?: {
    expireAfter: string;
    maxCount: number;
    minCount: number;
  };
}

/** Registers a local `fs` snapshot repository (only usable on non-Cloud deployments). */
export const createFsRepository = (esClient: EsClient, name: string, location: string) =>
  esClient.snapshot.createRepository({
    name,
    verify: false,
    repository: { type: 'fs', settings: { location } },
  });

// Deletes ignore 404 so teardown continues past resources that no longer exist.
export const deleteRepository = (esClient: EsClient, name: string) =>
  esClient.snapshot.deleteRepository({ name }, { ignore: [404] });

export const putSlmPolicy = (esClient: EsClient, policy: SeedSlmPolicy) =>
  esClient.slm.putLifecycle({
    policy_id: policy.policyName,
    name: policy.snapshotName,
    schedule: policy.schedule,
    repository: policy.repository,
    ...(policy.config
      ? {
          config: {
            indices: policy.config.indices,
            ignore_unavailable: policy.config.ignoreUnavailable,
          },
        }
      : {}),
    ...(policy.retention
      ? {
          retention: {
            expire_after: policy.retention.expireAfter,
            max_count: policy.retention.maxCount,
            min_count: policy.retention.minCount,
          },
        }
      : {}),
  });

export const deleteSlmPolicy = (esClient: EsClient, policyName: string) =>
  esClient.slm.deleteLifecycle({ policy_id: policyName }, { ignore: [404] });

/** Triggers an SLM policy run and returns the generated snapshot name. */
export const executeSlmPolicy = async (esClient: EsClient, policyName: string): Promise<string> => {
  const { snapshot_name: snapshotName } = await esClient.slm.executeLifecycle({
    policy_id: policyName,
  });
  return snapshotName;
};

/** Creates a snapshot and blocks until it completes so list/sort assertions are deterministic. */
export const createSnapshot = (esClient: EsClient, snapshot: string, repository: string) =>
  esClient.snapshot.create({ snapshot, repository, wait_for_completion: true });

export const deleteAllSnapshotsInRepo = (esClient: EsClient, repository: string) =>
  esClient.snapshot.delete({ repository, snapshot: '*' }, { ignore: [404] });
