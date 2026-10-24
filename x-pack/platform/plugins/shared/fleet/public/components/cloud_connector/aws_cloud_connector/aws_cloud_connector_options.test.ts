/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVALID_ROLE_ARN_MESSAGE } from '../utils';

import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';

describe('getAwsCloudConnectorsCredentialsFormOptions', () => {
  it.each(['role_arn', 'aws.role_arn'])('validates the role ARN format of %s', (varName) => {
    const [roleArnField] =
      getAwsCloudConnectorsCredentialsFormOptions({ [varName]: { value: '' } }) ?? [];

    expect(roleArnField.validate?.('123456')).toBe(INVALID_ROLE_ARN_MESSAGE);
    expect(roleArnField.validate?.('arn:aws:iam::123456789012:role/MyRole')).toBeUndefined();
    expect(roleArnField.validate?.('')).toBeUndefined();
  });

  it('does not validate the external ID format', () => {
    const [externalIdField] =
      getAwsCloudConnectorsCredentialsFormOptions({ external_id: { value: '' } }) ?? [];

    expect(externalIdField.validate).toBeUndefined();
  });
});
