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

  describe('when the IaC Provider is disabled', () => {
    beforeEach(() => {
      mockedUseIacProvider.mockReturnValue({ isIacProviderEnabled: false });
    });

    it('returns the static template URL and no launch handler', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));

      expect(result.current.templateUrl).toContain('param_ElasticResourceId=kibana-component-id');
      expect(result.current.launchTemplate).toBeUndefined();
      expect(result.current.isRendering).toBe(false);
    });
  });

  describe('when the IaC Provider is enabled', () => {
    beforeEach(() => {
      mockedUseIacProvider.mockReturnValue({ isIacProviderEnabled: true });
    });

    it('returns a launch handler instead of a static URL', () => {
      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));

      expect(result.current.templateUrl).toBeUndefined();
      expect(result.current.launchTemplate).toBeDefined();
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
      await act(async () => {
        await result.current.launchTemplate!();
      });

      expect(mockedSendRenderIacTemplate).toHaveBeenCalledWith({
        provider: 'aws',
        packageName: 'cloud_security_posture',
        policyTemplate: 'cspm',
      });
      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain(
        `templateURL=${encodeURIComponent('https://s3.example/rendered?sig=SECRET')}`
      );
      expect(openedUrl).not.toContain('static.example');
      expect(openedUrl).toContain('param_ElasticResourceId=kibana-component-id');
    });

    it('falls back to the static URL and reports telemetry when the render fails', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() => useCloudConnectorTemplate(HOOK_PARAMS));
      await act(async () => {
        await result.current.launchTemplate!();
      });

      const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
      expect(openedUrl).toContain('static.example');
      expect(reportEvent).toHaveBeenCalledWith('iac_provider_render_fallback', {
        flow: 'cloud_connector',
        reason: 'render_failed',
      });
      expect(result.current.renderError).toBeUndefined();
    });

    it('surfaces an error when the render fails and no static fallback exists', async () => {
      mockedSendRenderIacTemplate.mockResolvedValue({
        data: null,
        error: { message: 'unrenderable', statusCode: 422 },
      } as any);

      const { result } = renderHook(() =>
        useCloudConnectorTemplate({ ...HOOK_PARAMS, iacTemplateUrl: undefined })
      );
      await act(async () => {
        await result.current.launchTemplate!();
      });

      expect(windowOpenSpy).not.toHaveBeenCalled();
      expect(result.current.renderError).toBeDefined();
    });
  });
});
