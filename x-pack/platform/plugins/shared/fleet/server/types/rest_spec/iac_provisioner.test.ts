/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../common/telemetry/iac_provisioner_events';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../common/types/rest_spec/iac_provisioner';

import { RenderIacTemplateRequestSchema, RenderIacTemplateResponseSchema } from './iac_provisioner';

describe('RenderIacTemplateRequestSchema', () => {
  const body = (integrations: unknown) => ({
    provider: 'aws',
    workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
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

  it('accepts a compare-only response without an artifact when render is false', () => {
    expect(() =>
      RenderIacTemplateResponseSchema.validate({
        templateSha: 'sha256:abc',
        render: false,
        blueprint: { id: 'aws-federated-identity', version: '1.2.0' },
      })
    ).not.toThrow();
  });

  it('rejects a response without templateSha, render or blueprint (pre-contract provider)', () => {
    // The contract requires the verdict fields; the client fails such bodies open before they
    // reach the route. https://github.com/elastic/ingest-dev/issues/9415
    expect(() => RenderIacTemplateResponseSchema.validate(base)).toThrow();
  });

  it('rejects a blueprint missing its version', () => {
    expect(() =>
      RenderIacTemplateResponseSchema.validate({
        ...base,
        templateSha: 'sha256:abc',
        render: true,
        blueprint: { id: 'aws' },
      })
    ).toThrow();
  });
});
