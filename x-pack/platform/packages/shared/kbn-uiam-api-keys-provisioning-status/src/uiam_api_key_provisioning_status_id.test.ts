/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiamApiKeyProvisioningEntityType } from './uiam_api_key_provisioning_status';
import { buildUiamApiKeyProvisioningStatusId } from './uiam_api_key_provisioning_status_id';

describe('buildUiamApiKeyProvisioningStatusId', () => {
  it('prefixes the entity id with the entity type', () => {
    expect(
      buildUiamApiKeyProvisioningStatusId(UiamApiKeyProvisioningEntityType.RULE, 'abc-123')
    ).toBe('rule:abc-123');
    expect(
      buildUiamApiKeyProvisioningStatusId(UiamApiKeyProvisioningEntityType.TASK, 'abc-123')
    ).toBe('task:abc-123');
  });

  it('gives a rule and the task sharing its uuid distinct ids', () => {
    const sharedUuid = '1f7c9a4e-0000-4000-8000-000000000000';

    expect(
      buildUiamApiKeyProvisioningStatusId(UiamApiKeyProvisioningEntityType.RULE, sharedUuid)
    ).not.toBe(
      buildUiamApiKeyProvisioningStatusId(UiamApiKeyProvisioningEntityType.TASK, sharedUuid)
    );
  });
});
