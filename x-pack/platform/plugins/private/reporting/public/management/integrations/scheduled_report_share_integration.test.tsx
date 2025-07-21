/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SCHEDULED_REPORT_VALID_LICENSES } from '@kbn/reporting-common';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import {
  shouldRegisterScheduledReportShareIntegration,
  createScheduledReportShareIntegration,
} from './scheduled_report_share_integration';
import { queryClient } from '../../query_client';
import { ExportShareConfig } from '@kbn/share-plugin/public/types';

jest.mock('../hooks/use_get_reporting_health_query', () => ({
  getKey: jest.fn(() => 'reportingHealthKey'),
}));
jest.mock('../apis/get_reporting_health', () => ({
  getReportingHealth: jest.fn(),
}));
jest.mock('../components/scheduled_report_flyout_share_wrapper', () => ({
  ScheduledReportFlyoutShareWrapper: () => (
    <div data-test-subj="mockScheduledReportFlyoutShareWrapper" />
  ),
}));

describe('shouldRegisterScheduledReportShareIntegration', () => {
  const http = {} as any;
  let fetchQuerySpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    if (fetchQuerySpy) {
      fetchQuerySpy.mockRestore();
    }
    fetchQuerySpy = jest.spyOn(queryClient, 'fetchQuery');
  });

  it('should return true when secure and has encryption key', async () => {
    fetchQuerySpy.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
    });
    await expect(shouldRegisterScheduledReportShareIntegration(http)).resolves.toBe(true);
  });

  it('should return false when not secure', async () => {
    fetchQuerySpy.mockResolvedValue({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
    });
    await expect(shouldRegisterScheduledReportShareIntegration(http)).resolves.toBe(false);
  });

  it('should return false when no encryption key', async () => {
    fetchQuerySpy.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    });
    await expect(shouldRegisterScheduledReportShareIntegration(http)).resolves.toBe(false);
  });
});

describe('createScheduledReportShareIntegration', () => {
  const apiClient = {} as any;
  const services = {} as any;
  const integration = createScheduledReportShareIntegration({ apiClient, services });

  it('should return correct id, groupId, and shareType', () => {
    expect(integration).toMatchObject({
      id: 'scheduledReports',
      groupId: 'exportDerivatives',
      shareType: 'integration',
    });
  });

  describe('prerequisiteCheck', () => {
    const capabilities = {} as Capabilities;

    it.each([undefined, {}] as ILicense[])(
      'should return false if license is missing',
      (license) => {
        expect(
          integration.prerequisiteCheck!({
            license,
            capabilities,
            objectType: 'foo',
          })
        ).toBe(false);
      }
    );

    it('should return true for valid license', () => {
      expect(
        integration.prerequisiteCheck!({
          license: { type: SCHEDULED_REPORT_VALID_LICENSES[0] } as ILicense,
          capabilities,
          objectType: 'dashboard',
        })
      ).toBe(true);
    });

    it('should return false for invalid license', () => {
      expect(
        integration.prerequisiteCheck!({
          license: { type: 'basic' } as ILicense,
          capabilities,
          objectType: 'dashboard',
        })
      ).toBe(false);
    });
  });

  describe('config.shouldRender', () => {
    const config = integration.config!({
      sharingData: { exportType: 'pngV2' },
    } as unknown as Parameters<typeof integration.config>[0]);

    it('should return true when at least one supported export type is available', () => {
      expect(
        config.shouldRender!({
          availableExportItems: [
            { config: { exportType: 'pngV2' } },
            { config: { exportType: 'printablePdfV2' } },
          ] as unknown as ExportShareConfig[],
        })
      ).toBeTruthy();
    });

    it('should return false when no supported export type is available', () => {
      expect(
        config.shouldRender!({
          availableExportItems: [
            { config: { exportType: 'lens_csv' } },
          ] as unknown as ExportShareConfig[],
        })
      ).toBeFalsy();
    });
  });
});
