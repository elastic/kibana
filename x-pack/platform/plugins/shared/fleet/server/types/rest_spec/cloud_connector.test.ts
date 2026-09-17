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

  it.each([
    ['arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/fn:*', 'a CloudWatch Logs ARN'],
    ['arn:aws:iam::123456789012:role/MyRole', 'an IAM role ARN'],
    ['not-an-arn', 'a plain string'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u ', 'a trailing space'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u\n', 'a trailing newline'],
    ['arn:aws:cloudformation:us-east-1:123456789012:stack/s/u?x=1', 'a query string'],
  ])('create and update reject iac_deployment_id %s (%s) with a clear message', (value) => {
    // Same rule as the UI's stack ARN fields: any other ARN would be deep-linked as a stack.
    expect(() =>
      CreateCloudConnectorRequestSchema.body.validate({ ...validCreate, iac_deployment_id: value })
    ).toThrow(/must be a CloudFormation stack ARN/);
    expect(() =>
      UpdateCloudConnectorRequestSchema.body.validate({ iac_deployment_id: value })
    ).toThrow(/must be a CloudFormation stack ARN/);
  });

  it('accepts a stack ARN from another AWS partition', () => {
    expect(() =>
      UpdateCloudConnectorRequestSchema.body.validate({
        iac_deployment_id: 'arn:aws-us-gov:cloudformation:us-gov-west-1:123456789012:stack/s/u',
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
  it('accepts an empty body (flyout), an empty array, and several integrations (onboarding)', () => {
    expect(() => VerifyCloudConnectorIacKeyRequestSchema.body.validate({})).not.toThrow();
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({ integrations: [] })
    ).not.toThrow();
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integrations: [
          { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
          { name: 'aws_logs', policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }] },
        ],
      })
    ).not.toThrow();
  });

  it('accepts compare as a boolean and rejects a non-boolean', () => {
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({ compare: false })
    ).not.toThrow();
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({ compare: true, integrations: [] })
    ).not.toThrow();
    // schema.boolean() coerces the strings 'true'/'false'; anything else is rejected.
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({ compare: 'later' })
    ).toThrow();
  });

  it('rejects a surface field: the server derives the telemetry surface from the integrations', () => {
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({ surface: 'onboarding' })
    ).toThrow();
  });

  it('rejects the retired singular integration field', () => {
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integration: {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
      })
    ).toThrow();
  });

  it('rejects an integration with no policy templates', () => {
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integrations: [{ name: 'aws', policyTemplates: [] }],
      })
    ).toThrow();
  });

  it('rejects a policy template with no enabled inputs', () => {
    // An empty list would let IaCP render a template for a package the user enabled
    // nothing in; the render route takes the same shape and must reject it too.
    expect(() =>
      VerifyCloudConnectorIacKeyRequestSchema.body.validate({
        integrations: [
          { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: [] }] },
        ],
      })
    ).toThrow();
  });
});
