/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provisioner';
import { CLOUD_CONNECTOR_RENDER_FLOW } from '../../../../common/telemetry/iac_provisioner_events';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../../common/types/rest_spec/iac_provisioner';

import { getRenderIntegrations, renderArtifactTemplate } from './render_artifact_template';

jest.mock('../../../hooks/use_request/iac_provisioner');

const mockedSendRenderIacTemplate = jest.mocked(sendRenderIacTemplate);

const ARTIFACT_URL = 'https://s3.example/rendered?sig=SECRET';
const BLUEPRINT = { id: 'federated-identity', version: 'v1' };
const TEMPLATE_SHA = 'sha256:661cb7def1c7101f';
const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
const INTEGRATIONS = [
  {
    name: 'cloud_security_posture',
    policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
  },
];
const PARAMS = { provider: 'aws' as const, integrations: INTEGRATIONS };

const respond = (data: object | null, error: Error | null = null) =>
  mockedSendRenderIacTemplate.mockResolvedValue({ data, error } as never);

describe('getRenderIntegrations', () => {
  const policyTemplates = INTEGRATIONS[0].policyTemplates;

  it('drops integrations with no policy templates from an explicit set', () => {
    expect(
      getRenderIntegrations({
        integrations: [...INTEGRATIONS, { name: 'aws', policyTemplates: [] }],
      })
    ).toEqual(INTEGRATIONS);
  });

  it('builds a single integration from the package and its policy templates', () => {
    expect(
      getRenderIntegrations({ packageName: 'cloud_security_posture', policyTemplates })
    ).toEqual(INTEGRATIONS);
  });

  it('returns nothing without a package or enabled policy templates', () => {
    expect(getRenderIntegrations({ policyTemplates })).toEqual([]);
    expect(
      getRenderIntegrations({ packageName: 'cloud_security_posture', policyTemplates: [] })
    ).toEqual([]);
  });
});

describe('renderArtifactTemplate', () => {
  beforeEach(() => {
    mockedSendRenderIacTemplate.mockReset();
  });

  it('sends the federated identity render request, with the stored templateSha when set', async () => {
    respond({ render: false, templateSha: TEMPLATE_SHA, blueprint: BLUEPRINT });

    await renderArtifactTemplate({ ...PARAMS, templateSha: TEMPLATE_SHA });

    expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
      provider: 'aws',
      workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
      flow: CLOUD_CONNECTOR_RENDER_FLOW,
      integrations: INTEGRATIONS,
      templateSha: TEMPLATE_SHA,
    });
  });

  it('omits templateSha from the request when there is none', async () => {
    respond({ render: false, templateSha: TEMPLATE_SHA, blueprint: BLUEPRINT });

    await renderArtifactTemplate(PARAMS);

    expect(mockedSendRenderIacTemplate.mock.calls[0][0]).not.toHaveProperty('templateSha');
  });

  it('returns the quick-create launch URL with the stack params for a rendered artifact', async () => {
    respond({
      render: true,
      artifactUrl: ARTIFACT_URL,
      templateSha: TEMPLATE_SHA,
      blueprint: BLUEPRINT,
    });

    const result = await renderArtifactTemplate({
      ...PARAMS,
      stackParams: { ElasticOrganizationId: '2070044029' },
    });

    expect(result).toEqual({
      status: 'rendered',
      launchUrl: `https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=${encodeURIComponent(
        ARTIFACT_URL
      )}&param_ElasticOrganizationId=2070044029`,
      templateSha: TEMPLATE_SHA,
      blueprint: BLUEPRINT,
    });
  });

  it('builds the quick-create launch URL on the static URL when one is given', async () => {
    respond({
      render: true,
      artifactUrl: ARTIFACT_URL,
      templateSha: TEMPLATE_SHA,
      blueprint: BLUEPRINT,
    });

    const result = await renderArtifactTemplate({
      ...PARAMS,
      staticUrl:
        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https%3A%2F%2Fstatic.example%2Ft.yml&stackName=Elastic-Cloud-Connector',
    });

    expect(result).toMatchObject({
      status: 'rendered',
      launchUrl: `https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=${encodeURIComponent(
        ARTIFACT_URL
      )}&stackName=Elastic-Cloud-Connector`,
    });
  });

  it('returns the stack-update launch URL when a deployment id is known', async () => {
    respond({
      render: true,
      artifactUrl: ARTIFACT_URL,
      templateSha: TEMPLATE_SHA,
      blueprint: BLUEPRINT,
    });

    const result = await renderArtifactTemplate({ ...PARAMS, deploymentId: STACK_ARN });

    expect(result).toMatchObject({
      status: 'rendered',
      launchUrl: expect.stringContaining('#/stacks/update/template?stackId='),
    });
  });

  it('reports a current stack when IaCP answers render: false', async () => {
    respond({ render: false, templateSha: TEMPLATE_SHA, blueprint: BLUEPRINT });

    expect(await renderArtifactTemplate(PARAMS)).toEqual({ status: 'current' });
  });

  it('reports a failure for an error, no data, or a render without an artifact', async () => {
    respond(null, new Error('boom'));
    expect(await renderArtifactTemplate(PARAMS)).toEqual({ status: 'failed' });

    respond(null);
    expect(await renderArtifactTemplate(PARAMS)).toEqual({ status: 'failed' });

    respond({ render: true, templateSha: TEMPLATE_SHA, blueprint: BLUEPRINT });
    expect(await renderArtifactTemplate(PARAMS)).toEqual({ status: 'failed' });
  });

  it('reports no launch URL when the deployment id is not a usable stack ARN', async () => {
    respond({
      render: true,
      artifactUrl: ARTIFACT_URL,
      templateSha: TEMPLATE_SHA,
      blueprint: BLUEPRINT,
    });

    expect(await renderArtifactTemplate({ ...PARAMS, deploymentId: 'not-an-arn' })).toEqual({
      status: 'no_launch_url',
    });
  });
});
