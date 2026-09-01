/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { useIacProvisioner, useStartServices } from '../../../hooks';
import {
  sendRenderIacTemplate,
  sendResolveIacBlueprints,
} from '../../../hooks/use_request/iac_provisioner';

import { useCloudConnectorTemplate } from './use_cloud_connector_template';

jest.mock('../../../hooks');
jest.mock('../../../hooks/use_request/iac_provisioner');

const mockedUseIacProvisioner = jest.mocked(useIacProvisioner);
const mockedUseStartServices = jest.mocked(useStartServices);
const mockedSendRenderIacTemplate = jest.mocked(sendRenderIacTemplate);
const mockedSendResolveIacBlueprints = jest.mocked(sendResolveIacBlueprints);

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

const POLICY_TEMPLATES = [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }];

const HOOK_PARAMS = {
  cloud: CLOUD,
  accountType: 'single-account' as const,
  iacTemplateUrl: IAC_TEMPLATE_URL,
  packageName: 'cloud_security_posture',
  policyTemplates: POLICY_TEMPLATES,
};

const DEPLOYABLE_RESOLVE = {
  data: {
    blueprints: [
      {
        id: 'federated-identity',
        resolvedVersion: 'v1',
        deployable: true,
        notCovered: [],
      },
    ],
  },
  error: null,
};

const RENDERED = {
  data: {
    artifactUrl: 'https://s3.example/rendered?sig=SECRET',
    expiresAt: '2026-07-28T12:00:00Z',
    blueprint: { id: 'federated-identity', version: 'v1' },
  },
  error: null,
};

describe('useCloudConnectorTemplate', () => {
  let reportEvent: jest.Mock;
  let windowOpenSpy: jest.SpyInstance;
  let queryClient: QueryClient;
  // The tab the hook opens synchronously on click and navigates after the
  // render settles (popup blockers drop window.open calls made after an await).
  let cloudFormationTab: { closed: boolean; close: jest.Mock; location: { href: string } };

  beforeEach(() => {
    jest.clearAllMocks();
    reportEvent = jest.fn();
    mockedUseStartServices.mockReturnValue({ analytics: { reportEvent } } as any);
    cloudFormationTab = { closed: false, close: jest.fn(), location: { href: '' } };
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => cloudFormationTab as any);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

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
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });

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
      expect(mockedSendResolveIacBlueprints).not.toHaveBeenCalled();
    });

    it('is disabled when no static template URL can be built', () => {
      const { result } = renderHook(
        () => useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined }),
        { wrapper }
      );

      expect(result.current.isDisabled).toBe(true);
    });
  });

  describe('when the IaC Provisioner is enabled', () => {
    beforeEach(() => {
      mockedUseIacProvisioner.mockReturnValue({ isIacProvisionerEnabled: true });
      mockedSendResolveIacBlueprints.mockResolvedValue(DEPLOYABLE_RESOLVE as any);
      mockedSendRenderIacTemplate.mockResolvedValue(RENDERED as any);
    });

    const waitForResolve = async () => {
      await waitFor(() => {
        expect(mockedSendResolveIacBlueprints).toHaveBeenCalled();
      });
    };

    it('returns onClick button props instead of an href', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });

      expect(result.current.launchButtonProps).toHaveProperty('onClick');
      expect(result.current.launchButtonProps).not.toHaveProperty('href');
      expect(result.current.isDisabled).toBe(false);
    });

    it('resolves then renders just-in-time and opens the quick-create URL with the artifactUrl', async () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });
      await waitForResolve();
      await launch(result);

      expect(mockedSendResolveIacBlueprints).toHaveBeenCalledWith({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'cloud_security_posture', policyTemplates: POLICY_TEMPLATES }],
      });
      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        blueprintId: 'federated-identity',
        flow: 'cloud_connector',
        integrations: [{ name: 'cloud_security_posture', policyTemplates: POLICY_TEMPLATES }],
      });
      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
      const openedUrl = cloudFormationTab.location.href;
      expect(openedUrl).toContain(
        `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
      );
      expect(openedUrl).not.toContain('static.example');
      expect(openedUrl).toContain('param_ElasticResourceId=kibana-component-id');
    });

    it('sends every enabled policy template of the package', async () => {
      const policyTemplates = [
        { name: 'guardduty', enabledInputs: ['aws-s3'] },
        { name: 's3', enabledInputs: ['aws-s3'] },
      ];
      const { result } = renderHook(
        () =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            packageName: 'aws',
            policyTemplates,
          }),
        { wrapper }
      );
      await waitForResolve();
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        blueprintId: 'federated-identity',
        flow: 'cloud_connector',
        integrations: [{ name: 'aws', policyTemplates }],
      });
    });

    it('falls back to the static URL without rendering when no policy template is enabled', async () => {
      const { result } = renderHook(
        () => useCloudConnectorTemplate({ ...HOOK_PARAMS, policyTemplates: [] }),
        { wrapper }
      );
      await launch(result);

      expect(mockedSendResolveIacBlueprints).not.toHaveBeenCalled();
      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'missing_render_context',
      });
    });

    it('falls back to the static URL without rendering when the package name is missing', async () => {
      const { result } = renderHook(
        () => useCloudConnectorTemplate({ ...HOOK_PARAMS, packageName: undefined }),
        { wrapper }
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
      const { result } = renderHook(
        () =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            packageName: undefined,
            iacTemplateUrl: undefined,
          }),
        { wrapper }
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('falls back to the static URL when resolve finds no deployable blueprint', async () => {
      mockedSendResolveIacBlueprints.mockResolvedValue({
        data: {
          blueprints: [
            {
              id: 'federated-identity',
              resolvedVersion: null,
              deployable: false,
              notCovered: [
                { integration: 'cloud_security_posture', reason: 'below_support_floor' },
              ],
            },
          ],
        },
        error: null,
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });
      await waitForResolve();
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(cloudFormationTab.location.href).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'not_deployable',
      });
    });

    it('falls back to the static URL when resolve fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedSendResolveIacBlueprints.mockResolvedValue({
        data: null,
        error: { message: 'unavailable', statusCode: 502 },
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });
      await waitFor(() => {
        expect(mockedSendResolveIacBlueprints).toHaveBeenCalled();
      });
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(cloudFormationTab.location.href).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'resolve_failed',
      });
    });

    it('navigates the pre-opened tab to the static URL when the render fails', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });
      await waitForResolve();
      await launch(result);

      expect(cloudFormationTab.location.href).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provisioner_render_fallback', {
        flow: 'cloud_connector',
        reason: 'render_failed',
      });
      expect(result.current.templateGenerationError).toBeUndefined();
    });

    it('does not attempt a render when no static scaffold exists', async () => {
      const { result } = renderHook(
        () => useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined }),
        { wrapper }
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).not.toHaveBeenCalled();
      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('opens the static URL without rendering when it has no templateURL param to swap', async () => {
      const { result } = renderHook(
        () =>
          useCloudConnectorTemplate({
            ...HOOK_PARAMS,
            iacTemplateUrl: 'https://static.example/template.yml',
          }),
        { wrapper }
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

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });
      await waitForResolve();
      await launch(result);

      expect(cloudFormationTab.close).toHaveBeenCalled();
      expect(cloudFormationTab.location.href).toBe('');
      expect(result.current.templateGenerationError).toBeDefined();
    });

    it('falls back to a direct window.open when the pre-opened tab was blocked', async () => {
      windowOpenSpy.mockReturnValueOnce(null);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS), { wrapper });
      await waitForResolve();
      await launch(result);

      expect(windowOpenSpy).toHaveBeenCalledTimes(2);
      expect(windowOpenSpy.mock.calls[1][0]).toContain(
        `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
      );
    });
  });
});
