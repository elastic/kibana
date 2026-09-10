/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateCloudConnectorRequestSchema,
  UpdateCloudConnectorRequestSchema,
  VerifyCloudConnectorIacKeyRequestSchema,
} from './cloud_connector';

describe('cloud connector request schemas — IaC fields', () => {
  const validCreate = {
    name: 'c',
    cloudProvider: 'aws',
    vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/r' } },
  };

  it('create accepts iac_key and iac_deployment_id', () => {
    expect(() =>
      CreateCloudConnectorRequestSchema.body.validate({
        ...validCreate,
        iac_key: 'sha256:abc',
        iac_deployment_id: 'arn:aws:cloudformation:us-east-1:123456789012:stack/s/u',
      })
    ).not.toThrow();
  });

  it.each(['iac_key', 'iac_deployment_id'])('create rejects an empty %s', (field) => {
    expect(() =>
      CreateCloudConnectorRequestSchema.body.validate({ ...validCreate, [field]: '' })
    ).toThrow(/minimum length of \[1\]/);
  });

  it.each(['iac_key', 'iac_deployment_id'])('update rejects an empty %s', (field) => {
    expect(() => UpdateCloudConnectorRequestSchema.body.validate({ [field]: '' })).toThrow(
      /minimum length of \[1\]/
    );
  });

  it('update accepts omitting both fields', () => {
    expect(() =>
      UpdateCloudConnectorRequestSchema.body.validate({ name: 'renamed' })
    ).not.toThrow();
  });
});

describe('VerifyCloudConnectorIacKeyRequestSchema', () => {
  it('accepts an empty body (flyout) and a single integration (wizard)', () => {
    expect(() => VerifyCloudConnectorIacKeyRequestSchema.body.validate({})).not.toThrow();
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integration: {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
      })
    ).not.toThrow();
  });

  it('rejects an integration with no policy templates', () => {
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integration: { name: 'aws', policyTemplates: [] },
      })
    ).toThrow();
  });

  it('rejects a policy template with no enabled inputs', () => {
    // An empty list would let IaCP render a template for a package the user enabled
    // nothing in; the render route takes the same shape and must reject it too.
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integration: { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: [] }] },
      })
    ).toThrow();
  });
});
