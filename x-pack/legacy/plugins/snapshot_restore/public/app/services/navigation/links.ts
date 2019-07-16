/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../../constants';

export function linkToRepositories() {
  return `#${BASE_PATH}/repositories`;
}

export function linkToRepository(repositoryName: string) {
  return `#${BASE_PATH}/repositories/${encodeURIComponent(repositoryName)}`;
}

export function linkToEditRepository(repositoryName: string) {
  return `#${BASE_PATH}/edit_repository/${encodeURIComponent(repositoryName)}`;
}

export function linkToAddRepository() {
  return `#${BASE_PATH}/add_repository`;
}

export function linkToSnapshots(repositoryName?: string, policyName?: string) {
  if (repositoryName) {
    return `#${BASE_PATH}/snapshots?repository=${encodeURIComponent(repositoryName)}`;
  }
  if (policyName) {
    return `#${BASE_PATH}/snapshots?policy=${encodeURIComponent(policyName)}`;
  }
  return `#${BASE_PATH}/snapshots`;
}

export function linkToSnapshot(repositoryName: string, snapshotName: string) {
  return `#${BASE_PATH}/snapshots/${encodeURIComponent(repositoryName)}/${encodeURIComponent(
    snapshotName
  )}`;
}

export function linkToRestoreSnapshot(repositoryName: string, snapshotName: string) {
  return `#${BASE_PATH}/restore/${encodeURIComponent(repositoryName)}/${encodeURIComponent(
    snapshotName
  )}`;
}
