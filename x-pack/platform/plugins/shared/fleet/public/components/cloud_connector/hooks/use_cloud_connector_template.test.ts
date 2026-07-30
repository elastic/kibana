/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useIacProvider, useStartServices } from '../../../hooks';
import { sendRenderIacTemplate } from '../../../hooks/use_request/iac_provider';

import { useCloudConnectorTemplate } from './use_cloud_connector_template';

jest.mock('../../../hooks');
jest.mock('../../../hooks/use_request/iac_provider');

const mockedUseIacProvider = jest.mocked(useIacProvider);
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
  cloud: CLOUD,
  accountType: 'single-account' as const,
  iacTemplateUrl: IAC_TEMPLATE_URL,
  packageName: 'cloud_security_posture',
  policyTemplate: 'cspm',
};

describe('useCloudConnectorTemplate', () => {
  let reportEvent: jest.Mock;
  let windowOpenSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    reportEvent = jest.fn();
    mockedUseStartServices.mockReturnValue({ analytics: { reportEvent } } as any);
    windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
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

  describe('when the IaC Provider is disabled', () => {
    beforeEach(() => {
      mockedUseIacProvider.mockReturnValue({ isIacProviderEnabled: false });
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
  });

  describe('when the IaC Provider is enabled', () => {
    beforeEach(() => {
      mockedUseIacProvider.mockReturnValue({ isIacProviderEnabled: true });
    });

    it('returns onClick button props instead of an href', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));

      expect(result.current.launchButtonProps).toHaveProperty('onClick');
      expect(result.current.launchButtonProps).not.toHaveProperty('href');
      expect(result.current.isDisabled).toBe(false);
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

      // cloud_security_posture/cspm is in security_audit_policy_group which also
      // includes cloud_asset_inventory/asset_inventory — the whole group is sent.
      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [
          { name: 'cloud_security_posture', policyTemplates: ['cspm'] },
          { name: 'cloud_asset_inventory', policyTemplates: ['asset_inventory'] },
        ],
      });
      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain(
        `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
      );
      expect(openedUrl).not.toContain('static.example');
      expect(openedUrl).toContain('param_ElasticResourceId=kibana-component-id');
    });

    it('merges same-package policy group entries into one integration', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: { artifactUrl: 'https://s3.example/rendered', expiresAt: '2026-07-28T12:00:00Z' },
        error: null,
      } as any);

      // aws/guardduty is in aws_global_policy_group together with aws/s3 —
      // one EPR package, so one integration carrying both policy templates.
      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          packageName: 'aws',
          policyTemplate: 'guardduty',
        })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'aws', policyTemplates: ['guardduty', 's3'] }],
      });
    });

    it('sends a single integration when the package is not in any policy group', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: { artifactUrl: 'https://s3.example/rendered', expiresAt: '2026-07-28T12:00:00Z' },
        error: null,
      } as any);

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({
          ...HOOK_PARAMS,
          packageName: 'some_package',
          policyTemplate: 'some_template',
        })
      );
      await launch(result);

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        flow: 'cloud_connector',
        integrations: [{ name: 'some_package', policyTemplates: ['some_template'] }],
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
      expect(reportEvent).toHaveBeenCalledWith('iac_provider_render_fallback', {
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

    it('falls back to the static URL and reports telemetry when the render fails', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await launch(result);

      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provider_render_fallback', {
        flow: 'cloud_connector',
        reason: 'render_failed',
      });
      expect(result.current.templateGenerationError).toBeUndefined();
    });

    it('surfaces an error when the render fails and no static fallback exists', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined })
      );
      await launch(result);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.templateGenerationError).toBeDefined();
    });
  });
});
