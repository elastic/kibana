/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { RoleApiCredentials } from '@kbn/scout';
import { TRANSFORM_STATE, type TransformId } from '../../../../common';
import type { TransformApiServicesFixture } from '../fixtures';

export async function expectUnauthorizedTransform(
  transformId: TransformId,
  createdByUserCredentials: RoleApiCredentials,
  apiServices: TransformApiServicesFixture
) {
  const transformInfo = await apiServices.transform.getTransform(transformId);
  const expectedApiKeyId = createdByUserCredentials.apiKey.id;

  expect(typeof transformInfo.authorization.api_key).toBe('object');
  expect(transformInfo.authorization.api_key.id).toBe(expectedApiKeyId);

  const stats = await apiServices.transform.getTransformStats(transformId);
  expect(stats.state).toBe(TRANSFORM_STATE.STOPPED);
  expect(stats.health?.status).toBe('red');
  expect(stats.health?.issues![0].type).toBe('privileges_check_failed');
}

export async function expectReauthorizedTransform(
  transformId: TransformId,
  createdByUserCredentials: RoleApiCredentials,
  apiServices: TransformApiServicesFixture
) {
  const transformInfo = await apiServices.transform.getTransform(transformId);

  // assumption: each reauthorization generates a brand new API key, even for the same user
  expect(transformInfo.authorization.api_key.id).not.toBe(createdByUserCredentials.apiKey.id);

  const stats = await apiServices.transform.getTransformStats(transformId);
  expect(stats.health?.status).toBe('green');
}
