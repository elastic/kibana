/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getReportingShareIntegrationConfig } from './scheduled_report_share_integration';
import type { ExportShareConfig, ShareContext } from '@kbn/share-plugin/public/types';
import type { ReportingAPIClient } from '@kbn/reporting-public';

jest.mock('../components/scheduled_report_flyout_share_wrapper', () => ({
  ScheduledReportFlyoutShareWrapper: () => (
    <div data-test-subj="mockScheduledReportFlyoutShareWrapper" />
  ),
}));

describe('getReportingShareIntegrationConfig', () => {
  const mockApiClient = {} as jest.Mocked<ReportingAPIClient>;
  const mockServices = {} as any;
  const mockShareContext = {
    sharingData: { exportType: 'pngV2' },
  } as unknown as ShareContext;
  const { shouldRender } = getReportingShareIntegrationConfig(
    mockApiClient,
    mockServices,
    mockShareContext
  );

  describe('shouldRender', () => {
    it('should return true when at least one supported export type is available', async () => {
      expect(
        shouldRender({
          availableExportItems: [
            { config: { exportType: 'pngV2' } },
            { config: { exportType: 'printablePdfV2' } },
          ] as unknown as ExportShareConfig[],
        })
      ).toBeTruthy();
    });

    it('should return false when no supported export type is available', async () => {
      expect(
        shouldRender({
          availableExportItems: [
            { config: { exportType: 'lens_csv' } },
          ] as unknown as ExportShareConfig[],
        })
      ).toBeFalsy();
    });
  });
});
