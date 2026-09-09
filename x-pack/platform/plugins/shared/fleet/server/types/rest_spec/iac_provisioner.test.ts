/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../common/telemetry/iac_provisioner_events';

import { RenderIacTemplateRequestSchema, RenderIacTemplateResponseSchema } from './iac_provisioner';

describe('RenderIacTemplateRequestSchema', () => {
  const body = (integrations: unknown) => ({
    provider: 'aws',
    flow: CLOUD_CONNECTOR_RENDER_FLOW,
    integrations,
  });

  it('accepts policy templates carrying the inputs the user enabled', () => {
    expect(() =>
      RenderIacTemplateRequestSchema.body.validate(
        body([
          {
            name: 'aws',
            policyTemplates: [
              { name: 'guardduty', enabledInputs: ['aws-s3', 'aws-cloudwatch'] },
              { name: 's3', enabledInputs: ['aws-s3'] },
            ],
          },
        ])
      )
    ).not.toThrow();
  });

  it('rejects the pre-contract shape where policyTemplates were bare names', () => {
    expect(() =>
      RenderIacTemplateRequestSchema.body.validate(
        body([{ name: 'aws', policyTemplates: ['guardduty'] }])
      )
    ).toThrow();
  });

  it('rejects a policy template with no enabled inputs', () => {
    expect(() =>
      RenderIacTemplateRequestSchema.body.validate(
        body([{ name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: [] }] }])
      )
    ).toThrow();
  });
});

describe('RenderIacTemplateResponseSchema', () => {
  const base = { artifactUrl: 'https://s3.example/x', expiresAt: '2026-01-01T00:00:00Z' };

  it('accepts the full provider response', () => {
    expect(() =>
      RenderIacTemplateResponseSchema.validate({
        ...base,
        templateSha: 'sha256:abc',
        render: true,
        blueprint: { id: 'aws-federated-identity', version: '1.2.0' },
      })
    ).not.toThrow();
  });

  it('still accepts a response without templateSha, render or blueprint (pre-contract provider)', () => {
    expect(() => RenderIacTemplateResponseSchema.validate(base)).not.toThrow();
  });

  it('rejects a blueprint missing its version', () => {
    expect(() =>
      RenderIacTemplateResponseSchema.validate({ ...base, blueprint: { id: 'aws' } })
    ).toThrow();
  });

  it('ignores fields the provider adds, at the top level and inside blueprint', () => {
    // The route returns IaCP's body verbatim, so an additive provider field must not
    // fail response validation in dev/CI.
    expect(() =>
      RenderIacTemplateResponseSchema.validate({
        ...base,
        templateSha: 'sha256:abc',
        render: false,
        blueprint: { id: 'aws-federated-identity', version: '1.2.0', channel: 'stable' },
        renderedAt: '2026-01-01T00:00:00Z',
      })
    ).not.toThrow();
  });
});
