/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useIacProvisioner, useStartServices } from '../../../hooks';
import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provisioner';
import { IAC_FEDERATED_IDENTITY_WORKFLOW } from '../../../../common/types/rest_spec/iac_provisioner';

import { useCloudConnectorTemplate } from './use_cloud_connector_template';

jest.mock('../../../hooks');
jest.mock('../../../hooks/use_request/iac_provisioner');

const mockedUseIacProvisioner = jest.mocked(useIacProvisioner);
const mockedUseStartServices = jest.mocked(useStartServices);
const mockedSendRenderIacTemplate = jest.mocked(sendRenderIacTemplate);

// cloudId whose base64 part decodes to `host$es-id$kibana-component-id`
const CLOUD_ID = `test:${btoa('host$es-component-id$kibana-component-id')}`;

const CLOUD = {
  isCloudEnabled: true,
  isServerlessEnabled: false,
  cloudId: CLOUD_ID,
  cloudHost: 'cloud.example',
  deploymentUrl: 'https://cloud.example/deployments/abc123',
  deploymentId: 'abc123',
  serverless: {},
} as any;

const IAC_TEMPLATE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https%3A%2F%2Fstatic.example%2Ftemplate.yml&param_ElasticResourceId=RESOURCE_ID';

const POLICY_TEMPLATES = [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }];

const HOOK_PARAMS = {
  provider: 'aws' as const,
  cloud: CLOUD,
  accountType: 'single-account' as const,
  iacTemplateUrl: IAC_TEMPLATE_URL,
  packageName: 'cloud_security_posture',
  policyTemplates: POLICY_TEMPLATES,
};

const ARTIFACT_URL = 'https://s3.example/rendered?sig=SECRET';
const BLUEPRINT = { id: 'federated-identity', version: 'v1' };

const RENDERED = {
  data: {
    artifactUrl: ARTIFACT_URL,
    expiresAt: '2026-07-28T12:00:00Z',
    templateSha: 'sha256:661cb7def1c7101f',
    render: true,
    blueprint: BLUEPRINT,
  },
  error: null,
};

const STATIC_FALLBACK_CONFIRM = {
  iac_key: null,
  iac_blueprint_id: null,
  iac_blueprint_version: null,
};

describe('useCloudConnectorTemplate', () => {
  let reportEvent: jest.Mock;
  let windowOpenSpy: jest.SpyInstance;
  // The tab the hook opens synchronously on click and navigates after the
  // render settles (popup blockers drop window.open calls made after an await).
  let cloudFormationTab: { closed: boolean; close: jest.Mock; location: { href: string } };

  beforeEach(() => {
    jest.clearAllMocks();
    reportEvent = jest.fn();
    mockedUseStartServices.mockReturnValue({ analytics: { reportEvent } } as any);
    cloudFormationTab = { closed: false, close: jest.fn(), location: { href: '' } };
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => cloudFormationTab as any);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  const launch = async (result: { current: ReturnType<typeof useCloudConnectorTemplate> }) => {
    const { launchButtonProps } = result.current;
    if (!('onClick' in launchButtonProps)) {
      throw new Error('expected onClick launch button props');
    }
    await act(async () => {
      await launchButtonProps.onClick();
    });
  };

  describe('when the IaC Provisioner is disabled', () => {
    beforeEach(() => {
      mockedUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: false });
    });

    it('returns href button props with the static template URL', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));

      const { launchButtonProps } = result.current;
      if (!('href' in launchButtonProps)) {
        throw new Error('expected href launch button props');
      }
      expect(launchButtonProps.href).toContain(
        `templateURL=${encodeURIComponent('https://static.example/template.yml')}`
      );
      expect(launchButtonProps.href).toContain('param_ElasticResourceId=kibana-component-id');
      expect(launchButtonProps.target).toBe('_blank');
      expect(result.current.isDisabled).toBe(false);
      expect(result.current.isGeneratingTemplate).toBe(false);
      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
    });

    it('is disabled when no static template URL can be built', () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined })
      );

      expect(result.current.isDisabled).toBe(true);
    });

    it('names the template tokens this Kibana cannot resolve', () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          iacTemplateUrl: `${IAC_TEMPLATE_URL}&param_ElasticOrganizationId=ORGANIZATION_ID`,
        })
      );

      expect(result.current.isDisabled).toBe(true);
      expect(result.current.templateGenerationError).toContain('ORGANIZATION_ID');
    });
  });

  describe('when the IaC Provisioner is enabled', () => {
    beforeEach(() => {
      mockedUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockedSendRenderIacTemplate.mockResolvedValue(RENDERED as any);
    });

    it('reports the unresolved template tokens instead of rendering', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          iacTemplateUrl: `${IAC_TEMPLATE_URL}&param_ElasticOrganizationId=ORGANIZATION_ID`,
        })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toContain('ORGANIZATION_ID');
    });

    it('returns onClick button props instead of an href', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));

      expect(result.current.launchButtonProps).toHaveProperty('onClick');
      expect(result.current.launchButtonProps).not.toHaveProperty('href');
      expect(result.current.isDisabled).toBe(false);
    });

    it('renders just-in-time and opens the quick-create URL with the artifactUrl', async () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
        flow: 'cloud_connector',
        integrations: [{ name: 'cloud_security_posture', policyTemplates: POLICY_TEMPLATES }],
      });
      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
      const openedUrl = cloudFormationTab.location.href;
      expect(openedUrl).toContain(`templateURL=${encodeURIComponent(ARTIFACT_URL)}`);
      expect(openedUrl).not.toContain('static.example');
      expect(openedUrl).toContain('param_ElasticResourceId=kibana-component-id');
      expect(result.current.iacConfirm).toEqual({
        iac_key: 'sha256:661cb7def1c7101f',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: 'v1',
      });
    });

    it('sends every enabled policy template of the package', async () => {
      const policyTemplates = [
        { name: 'guardduty', enabledInputs: ['aws-s3'] },
        { name: 's3', enabledInputs: ['aws-s3'] },
      ];
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, packageName: 'aws', policyTemplates })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
        flow: 'cloud_connector',
        integrations: [{ name: 'aws', policyTemplates }],
      });
    });

    it('falls back to the static URL without rendering when no policy template is enabled', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, policyTemplates: [] })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain('static.example');
      expect(result.current.iacConfirm).toEqual(STATIC_FALLBACK_CONFIRM);
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'missing_render_context',
      });
    });

    it('falls back to the static URL without rendering when the package name is missing', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, packageName: undefined })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'missing_render_context',
      });
      expect(result.current.templateGenerationError).toBeUndefined();
    });

    it('surfaces an error when the package name is missing and no static fallback exists', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          packageName: undefined,
          iacTemplateUrl: undefined,
        })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('navigates the pre-opened tab to the static URL when the render fails', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      expect(cloudFormationTab.location.href).toContain('static.example');
      expect(result.current.iacConfirm).toEqual(STATIC_FALLBACK_CONFIRM);
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'render_failed',
      });
      expect(result.current.templateGenerationError).toBeUndefined();
    });

    it('does not call onTemplateRendered when the render fails', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const onTemplateRendered = jest.fn();
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, onTemplateRendered })
      );
      await launch(result);

      expect(onTemplateRendered).not.toHaveBeenCalled();
    });

    it('does not attempt a render when no static scaffold exists', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('opens the static URL without rendering when it has no templateURL param to swap', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          iacTemplateUrl: 'https://static.example/template.yml',
        })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'missing_render_context',
      });
      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
      expect(windowOpenSpy.mock.calls[0][0]).toContain('static.example');
    });

    it('closes the pre-opened tab and surfaces an error when the render request throws', async () => {
      mockedSendRenderIacTemplate.mockRejectedValue(new Error('network down'));

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      expect(cloudFormationTab.close).toHaveBeenCalled();
      expect(cloudFormationTab.location.href).toBe('');
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('does not persist a previous confirm when a later launch throws', async () => {
      mockedSendRenderIacTemplate
        .mockResolvedValueOnce(RENDERED as never)
        .mockRejectedValueOnce(new Error('network down'));

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);
      expect(result.current.iacConfirm).toEqual({
        iac_key: 'sha256:661cb7def1c7101f',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: 'v1',
      });

      await launch(result);
      expect(result.current.templateGenerationError).toBeDefined();
      expect(result.current.iacConfirm).toBeUndefined();
    });

    it('drops the confirm once the consumer clears it, until the next launch', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue(RENDERED as never);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);
      expect(result.current.iacConfirm).toBeDefined();

      act(() => {
        result.current.clearIacConfirm();
      });
      expect(result.current.iacConfirm).toBeUndefined();

      // A new launch records its own template details again.
      await launch(result);
      expect(result.current.iacConfirm).toEqual({
        iac_key: 'sha256:661cb7def1c7101f',
        iac_blueprint_id: 'federated-identity',
        iac_blueprint_version: 'v1',
      });
    });

    it('falls back to a direct window.open when the pre-opened tab was blocked, and still records the template details when that opens', async () => {
      windowOpenSpy.mockReturnValueOnce(null);
      const onTemplateRendered = jest.fn();

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, onTemplateRendered })
      );
      await launch(result);

      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
      expect(windowOpenSpy.mock.calls[1][0]).toContain(
        `templateURL=${encodeURIComponent(ARTIFACT_URL)}`
      );
      expect(onTemplateRendered).toHaveBeenCalledTimes(1);
      expect(result.current.iacConfirm).toEqual(
        expect.objectContaining({ iac_key: 'sha256:661cb7def1c7101f' })
      );
      expect(result.current.templateGenerationError).toBeUndefined();
    });

    it('records nothing and reports an error when the console could not be opened at all', async () => {
      // Both the pre-opened tab and the direct open were eaten by a pop-up blocker: the user never
      // saw the template, so no digest may be recorded and no caller unblocked.
      windowOpenSpy.mockReturnValue(null);
      const onTemplateRendered = jest.fn();

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, onTemplateRendered })
      );
      await launch(result);

      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
      expect(onTemplateRendered).not.toHaveBeenCalled();
      expect(result.current.iacConfirm).toBeUndefined();
      expect(result.current.templateGenerationError).toBe(
        'The CloudFormation console could not be opened. Allow pop-ups for Kibana and try again.'
      );
      expect(result.current.isGeneratingTemplate).toBe(false);
    });

    it('records the template details only after navigating the pre-opened tab', async () => {
      // Captured inside the callback and asserted afterwards: an expect thrown inside it would be
      // swallowed by the hook's catch and the test would pass on a regressed order.
      let hrefWhenNotified: string | undefined;
      const onTemplateRendered = jest.fn(() => {
        hrefWhenNotified = cloudFormationTab.location.href;
      });

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, onTemplateRendered })
      );
      await launch(result);

      expect(onTemplateRendered).toHaveBeenCalledTimes(1);
      // By the time the caller heard about the render, the console page was already loading.
      expect(hrefWhenNotified).toContain(`templateURL=${encodeURIComponent(ARTIFACT_URL)}`);
      expect(result.current.templateGenerationError).toBeUndefined();
    });

    it('does not record the missing-context static fallback when the console could not be opened', async () => {
      windowOpenSpy.mockReturnValue(null);

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, policyTemplates: [] })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(result.current.iacConfirm).toBeUndefined();
      expect(result.current.templateGenerationError).toBe(
        'The CloudFormation console could not be opened. Allow pop-ups for Kibana and try again.'
      );
    });

    it('does not record the static fallback confirm when the console could not be opened', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: new Error('down'),
      } as any);
      windowOpenSpy.mockReturnValue(null);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      expect(result.current.iacConfirm).toBeUndefined();
      expect(result.current.templateGenerationError).toBe(
        'The CloudFormation console could not be opened. Allow pop-ups for Kibana and try again.'
      );
    });

    describe('stored digest comparison (templateSha)', () => {
      it('sends templateSha on render when the caller supplies a stored digest', async () => {
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, templateSha: 'sha256:661cb7def1c7101f' })
        );
        await launch(result);

        expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith(
          expect.objectContaining({ templateSha: 'sha256:661cb7def1c7101f' })
        );
      });

      it('omits templateSha on first render', async () => {
        const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
        await launch(result);

        expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith(
          expect.not.objectContaining({ templateSha: expect.anything() })
        );
      });

      it('closes the pre-opened tab and reports the stack is current when render is false', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: { templateSha: 'sha256:661cb7def1c7101f', render: false, blueprint: BLUEPRINT },
          error: null,
        } as any);

        const onTemplateRendered = jest.fn();
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            templateSha: 'sha256:661cb7def1c7101f',
            onTemplateRendered,
          })
        );
        await launch(result);

        expect(cloudFormationTab.close).toHaveBeenCalled();
        expect(cloudFormationTab.location.href).toBe('');
        expect(result.current.templateAlreadyCurrent).toBeDefined();
        expect(result.current.templateGenerationError).toBeUndefined();
        expect(result.current.iacConfirm).toBeUndefined();
        expect(onTemplateRendered).not.toHaveBeenCalled();
        expect(reportEvent).not.toHaveBeenCalled();
      });

      it('clears a stale fallback confirm when a later launch reports render false', async () => {
        mockedSendRenderIacTemplate
          .mockResolvedValueOnce({
            data: null,
            error: { message: 'unrenderable', statusCode: 422 },
          } as any)
          .mockResolvedValueOnce({
            data: { templateSha: 'sha256:661cb7def1c7101f', render: false, blueprint: BLUEPRINT },
            error: null,
          } as any);

        const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
        await launch(result);
        expect(result.current.iacConfirm).toEqual(STATIC_FALLBACK_CONFIRM);

        await launch(result);
        expect(result.current.iacConfirm).toBeUndefined();
        expect(result.current.templateAlreadyCurrent).toBeDefined();
      });

      it('falls back to the static URL when render is missing from the response', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: { ...RENDERED.data, render: undefined },
          error: null,
        } as any);

        const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
        await launch(result);

        expect(cloudFormationTab.location.href).toContain('static.example');
        expect(result.current.templateAlreadyCurrent).toBeUndefined();
        expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
          flow: 'cloud_connector',
          reason: 'render_failed',
        });
      });

      it('falls back to the static URL when render is true but artifactUrl is missing', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: { templateSha: 'sha256:661cb7def1c7101f', render: true, blueprint: BLUEPRINT },
          error: null,
        } as any);

        const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
        await launch(result);

        expect(cloudFormationTab.location.href).toContain('static.example');
        expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
          flow: 'cloud_connector',
          reason: 'render_failed',
        });
      });
    });

    describe('onTemplateRendered and the integrations override', () => {
      it('calls onTemplateRendered with the key, blueprint and the integrations it rendered', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: {
            ...RENDERED.data,
            templateSha: 'sha256:abc',
            blueprint: { id: 'aws/federated-identity', version: '1.0.0' },
          },
          error: null,
        } as any);

        const onTemplateRendered = jest.fn();
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, onTemplateRendered })
        );
        await launch(result);

        // The rendered set travels with the key so callers can tell when the enabled
        // inputs were edited after the template was generated; the blueprint lets them
        // store the template details alongside the key.
        expect(onTemplateRendered).toHaveBeenCalledWith({
          key: 'sha256:abc',
          integrations: [{ name: 'cloud_security_posture', policyTemplates: POLICY_TEMPLATES }],
          blueprintId: 'aws/federated-identity',
          blueprintVersion: '1.0.0',
        });
      });

      it('reports the integrations override as the rendered set', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: { ...RENDERED.data, templateSha: 'sha256:abc' },
          error: null,
        } as any);

        const integrations = [
          { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] },
        ];
        const onTemplateRendered = jest.fn();
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, integrations, onTemplateRendered })
        );
        await launch(result);

        expect(onTemplateRendered).toHaveBeenCalledWith(
          expect.objectContaining({ key: 'sha256:abc', integrations })
        );
      });

      it('sends the integrations payload when the caller supplies several packages', async () => {
        const integrations = [
          {
            name: 'aws',
            policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
          },
          {
            name: 'aws_securityhub',
            policyTemplates: [{ name: 'aws_securityhub', enabledInputs: ['aws-s3'] }],
          },
        ];
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            packageName: 'ignored',
            policyTemplates: [{ name: 'unused', enabledInputs: ['input'] }],
            integrations,
          })
        );
        await launch(result);

        expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
          provider: 'aws',
          workflow: IAC_FEDERATED_IDENTITY_WORKFLOW,
          flow: 'cloud_connector',
          integrations,
        });
      });

      it('drops packages with no policy templates from the integrations payload', async () => {
        const usable = {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        };
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            integrations: [usable, { name: 'aws_securityhub', policyTemplates: [] }],
          })
        );
        await launch(result);

        expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith(
          expect.objectContaining({ integrations: [usable] })
        );
      });
    });

    describe('stack update (deploymentId)', () => {
      const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';

      it('navigates to the stack-update deep link when a deploymentId is provided', async () => {
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, deploymentId: STACK_ARN })
        );
        await launch(result);

        const openedUrl = cloudFormationTab.location.href;
        expect(openedUrl).toMatch(
          /^https:\/\/console\.aws\.amazon\.com\/cloudformation\/home\?region=us-east-1#\/stacks\/update\/template\?stackId=/
        );
        expect(openedUrl).toContain(encodeURIComponent(STACK_ARN));
        expect(openedUrl).toContain(`&templateURL=${encodeURIComponent(ARTIFACT_URL)}`);
      });

      it('closes the pre-opened tab and surfaces an error when the launch URL cannot be built (malformed ARN)', async () => {
        const onTemplateRendered = jest.fn();
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            deploymentId: 'not-an-arn',
            iacTemplateUrl: undefined,
            onTemplateRendered,
          })
        );
        await launch(result);

        expect(cloudFormationTab.close).toHaveBeenCalled();
        expect(cloudFormationTab.location.href).toBe('');
        expect(result.current.templateGenerationError).toBeDefined();
        // Neither the template details nor the callback may reflect a console that never opened.
        expect(result.current.iacConfirm).toBeUndefined();
        expect(onTemplateRendered).not.toHaveBeenCalled();
      });

      it('closes the pre-opened tab and surfaces an error when deploymentId is set but no static URL and the render fails', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: null,
          error: { message: 'unrenderable', statusCode: 422 },
        } as any);

        const { result } = renderHook(() =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            iacTemplateUrl: undefined,
            deploymentId: STACK_ARN,
          })
        );
        await launch(result);

        expect(cloudFormationTab.close).toHaveBeenCalled();
        // The tab should not have been navigated anywhere.
        expect(cloudFormationTab.location.href).toBe('');
        expect(result.current.templateGenerationError).toBeDefined();
      });
    });

    describe('and the static template fallback is turned off', () => {
      // Update flows (the wizard's mismatch callout, the flyout's upgrade callout) act on an
      // identity that already has a generated template: opening the static one would downgrade it.
      it('closes the pre-opened tab and surfaces an error instead of opening the static URL when the render fails', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: null,
          error: { message: 'unrenderable', statusCode: 422 },
        } as any);

        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, staticTemplateFallback: false })
        );
        await launch(result);

        expect(cloudFormationTab.close).toHaveBeenCalled();
        expect(cloudFormationTab.location.href).toBe('');
        // Only the blank tab was opened; nothing navigated to the static template.
        expect(windowOpenSpy).toHaveBeenCalledTimes(1);
        expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
        expect(result.current.templateGenerationError).toBeDefined();
        // No static confirm is recorded: the identity keeps whatever it had.
        expect(result.current.iacConfirm).toBeUndefined();
        // The fallback still happened as far as telemetry is concerned: the render failed.
        expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
          flow: 'cloud_connector',
          reason: 'render_failed',
        });
      });

      it('surfaces an error instead of opening the static URL when the render context is missing', async () => {
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            packageName: undefined,
            staticTemplateFallback: false,
          })
        );
        await launch(result);

        expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
        expect(windowOpenSpy).not.toHaveBeenCalled();
        expect(result.current.templateGenerationError).toBeDefined();
        expect(result.current.iacConfirm).toBeUndefined();
        expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
          flow: 'cloud_connector',
          reason: 'missing_render_context',
        });
      });

      it('still swaps the rendered artifact into the quick-create scaffold on success', async () => {
        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, staticTemplateFallback: false })
        );
        await launch(result);

        expect(cloudFormationTab.location.href).toContain(
          `templateURL=${encodeURIComponent(ARTIFACT_URL)}`
        );
        expect(result.current.templateGenerationError).toBeUndefined();
      });
    });
  });
});
