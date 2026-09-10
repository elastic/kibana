/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useIacProvisioner, useStartServices } from '../../../hooks';
import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provisioner';

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
  serverless: {},
} as any;

const IAC_TEMPLATE_URL =
  'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?templateURL=https%3A%2F%2Fstatic.example%2Ftemplate.yml&param_ElasticResourceId=RESOURCE_ID';

const HOOK_PARAMS = {
  provider: 'aws' as const,
  cloud: CLOUD,
  accountType: 'single-account' as const,
  iacTemplateUrl: IAC_TEMPLATE_URL,
  packageName: 'cloud_security_posture',
  policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
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
      // The templateURL param is what distinguishes the static template from
      // an IaC-rendered artifact; both carry the same ElasticResourceId.
      expect(launchButtonProps.href).toContain(
        `templateURL=${encodeURIComponent('https://static.example/template.yml')}`
      );
      expect(launchButtonProps.href).toContain('param_ElasticResourceId=kibana-component-id');
      expect(launchButtonProps.target).toBe('_blank');
      expect(result.current.isDisabled).toBe(false);
      expect(result.current.isGeneratingTemplate).toBe(false);
    });

    it('is disabled when no static template URL can be built', () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined })
      );

      expect(result.current.isDisabled).toBe(true);
    });

    it('exposes isIacProvisionerEnabled as false', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      expect(result.current.isIacProvisionerEnabled).toBe(false);
    });
  });

  describe('when the IaC Provisioner is enabled', () => {
    beforeEach(() => {
      mockedUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
    });

    it('returns onClick button props instead of an href', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));

      expect(result.current.launchButtonProps).toHaveProperty('onClick');
      expect(result.current.launchButtonProps).not.toHaveProperty('href');
      expect(result.current.isDisabled).toBe(false);
    });

    it('exposes isIacProvisionerEnabled as true', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      expect(result.current.isIacProvisionerEnabled).toBe(true);
    });

    it('renders just-in-time and opens the quick-create URL with the artifactUrl', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: {
          artifactUrl: 'https://s3.example/rendered?sig=SECRET',
          expiresAt: '2026-07-28T12:00:00Z',
        },
        error: null,
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      // Exactly the enabled policy templates are sent — nothing is inferred
      // from connector-sharing policy groups.
      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'cloud_security_posture',
            policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
          },
        ],
      });
      // The tab opens blank within the click gesture, then gets navigated.
      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
      const openedUrl = cloudFormationTab.location.href;
      expect(openedUrl).toContain(
        `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
      );
      expect(openedUrl).not.toContain('static.example');
      expect(openedUrl).toContain('param_ElasticResourceId=kibana-component-id');
    });

    it('sends every enabled policy template of the package', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: { artifactUrl: 'https://s3.example/rendered', expiresAt: '2026-07-28T12:00:00Z' },
        error: null,
      } as any);

      // The aws package exposes many policy templates; the user enabled two.
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          packageName: 'aws',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3'] },
            { name: 's3', enabledInputs: ['aws-s3'] },
          ],
        })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          {
            name: 'aws',
            policyTemplates: [
              { name: 'guardduty', enabledInputs: ['aws-s3'] },
              { name: 's3', enabledInputs: ['aws-s3'] },
            ],
          },
        ],
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

    it('navigates the pre-opened tab to the static URL and reports telemetry when the render fails', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      expect(cloudFormationTab.location.href).toContain('static.example');
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

      // Without the quick-create scaffold there is nothing to swap the
      // rendered artifact into, so the render is skipped entirely.
      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('opens the static URL without rendering when it has no templateURL param to swap', async () => {
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          // A bare template URL, as some package manifests ship: usable as a
          // plain link but not as a quick-create scaffold.
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

    it('falls back to a direct window.open when the pre-opened tab was blocked', async () => {
      windowOpenSpy.mockReturnValueOnce(null);
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: {
          artifactUrl: 'https://s3.example/rendered?sig=SECRET',
          expiresAt: '2026-07-28T12:00:00Z',
        },
        error: null,
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
      expect(windowOpenSpy.mock.calls[1][0]).toContain(
        `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
      );
    });

    it('calls onTemplateRendered with the key returned by IaCP and the integrations it rendered', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: {
          artifactUrl: 'https://s3.example/rendered?sig=SECRET',
          expiresAt: '2026-07-28T12:00:00Z',
          templateSha: 'sha256:abc',
          render: true,
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
      // inputs were edited after the template was generated.
      expect(onTemplateRendered).toHaveBeenCalledWith({
        key: 'sha256:abc',
        integrations: [
          {
            name: 'cloud_security_posture',
            policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
          },
        ],
      });
    });

    it('reports the integrations override as the rendered set', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: {
          artifactUrl: 'https://s3.example/rendered?sig=SECRET',
          expiresAt: '2026-07-28T12:00:00Z',
          templateSha: 'sha256:abc',
        },
        error: null,
      } as any);

      const integrations = [
        {
          name: 'aws',
          policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }],
        },
      ];
      const onTemplateRendered = jest.fn();
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, integrations, onTemplateRendered })
      );
      await launch(result);

      expect(onTemplateRendered).toHaveBeenCalledWith({ key: 'sha256:abc', integrations });
    });

    it('navigates to the stack-update deep link when a deploymentId is provided', async () => {
      const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
      const ARTIFACT_URL = 'https://s3.example/rendered?sig=SECRET';
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: {
          artifactUrl: ARTIFACT_URL,
          expiresAt: '2026-07-28T12:00:00Z',
        },
        error: null,
      } as any);

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
      const MALFORMED_ARN = 'not-an-arn';
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: {
          artifactUrl: 'https://s3.example/rendered?sig=SECRET',
          expiresAt: '2026-07-28T12:00:00Z',
        },
        error: null,
      } as any);

      const onTemplateRendered = jest.fn();
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          deploymentId: MALFORMED_ARN,
          iacTemplateUrl: undefined,
          onTemplateRendered,
        })
      );
      await launch(result);

      expect(cloudFormationTab.close).toHaveBeenCalled();
      expect(cloudFormationTab.location.href).toBe('');
      expect(result.current.templateGenerationError).toBeDefined();
      // onTemplateRendered must not fire when the console was never opened.
      expect(onTemplateRendered).not.toHaveBeenCalled();
    });

    it('closes the pre-opened tab and surfaces an error when deploymentId is set but no static URL and the render fails', async () => {
      const STACK_ARN = 'arn:aws:cloudformation:us-east-1:123456789012:stack/my-stack/uuid';
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
        expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
          flow: 'cloud_connector',
          reason: 'missing_render_context',
        });
      });

      it('still swaps the rendered artifact into the quick-create scaffold on success', async () => {
        mockedSendRenderIacTemplate.mockResolvedValue({
          data: {
            artifactUrl: 'https://s3.example/rendered?sig=SECRET',
            expiresAt: '2026-07-28T12:00:00Z',
          },
          error: null,
        } as any);

        const { result } = renderHook(() =>
          useCloudConnectorTemplate({ ...HOOK_PARAMS, staticTemplateFallback: false })
        );
        await launch(result);

        expect(cloudFormationTab.location.href).toContain(
          `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
        );
        expect(result.current.templateGenerationError).toBeUndefined();
      });
    });

    it('uses integrations override instead of packageName/policyTemplates when provided', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: { artifactUrl: 'https://s3.example/rendered', expiresAt: '2026-07-28T12:00:00Z' },
        error: null,
      } as any);

      const customIntegrations = [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3'] },
            { name: 's3', enabledInputs: ['aws-s3'] },
          ],
        },
        {
          name: 'cloud_security_posture',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }],
        },
      ];
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, integrations: customIntegrations })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ integrations: customIntegrations })
      );
    });
  });
});
