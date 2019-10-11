/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../../constants';

export function linkToHome() {
  return `#${BASE_PATH}`;
}

export function linkToRepositories() {
  return `#${BASE_PATH}/repositories`;
}

export function linkToRepository(repositoryName: string) {
  return `#${BASE_PATH}/repositories/${encodeURIComponent(repositoryName)}`;
}

export function linkToEditRepository(repositoryName: string) {
  return `#${BASE_PATH}/edit_repository/${encodeURIComponent(repositoryName)}`;
}

export function linkToAddRepository(redirect?: string) {
  return `#${BASE_PATH}/add_repository${
    redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
  }`;
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

export function linkToPolicies() {
  return `#${BASE_PATH}/policies`;
}

export function linkToPolicy(policyName: string) {
  return `#${BASE_PATH}/policies/${encodeURIComponent(policyName)}`;
}

export function linkToEditPolicy(policyName: string) {
  return `#${BASE_PATH}/edit_policy/${encodeURIComponent(policyName)}`;
}

export function linkToAddPolicy() {
  return `#${BASE_PATH}/add_policy`;
}

export function linkToRestoreStatus() {
  return `#${BASE_PATH}/restore_status`;
}
