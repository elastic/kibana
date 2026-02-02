/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpServiceSetup, PluginInitializerContext } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { LICENSE_TYPE_GOLD } from '@kbn/reporting-common';
import type {
  BaseExportTypeSetupDeps,
  BaseExportTypeStartDeps,
  ExportType,
  ReportingConfigType,
} from '@kbn/reporting-server';

export const getExportType = (overwrites = {}): ExportType => {
  return {
    id: 'test',
    name: 'Test Export Type',
    jobType: 'testJobType',
    jobContentExtension: 'pdf',
    validLicenses: [LICENSE_TYPE_GOLD],
    setup: jest.fn(),
    start: jest.fn(),
    shouldNotifyUsage: () => false,
    getFeatureUsageName: () => 'Reporting: test export',
    notifyUsage: jest.fn(),
    createJob: jest.fn(),
    runTask: jest.fn(),
    setupDeps: {} as unknown as BaseExportTypeSetupDeps,
    startDeps: {} as unknown as BaseExportTypeStartDeps,
    http: {} as unknown as HttpServiceSetup,
    config: {} as unknown as ReportingConfigType,
    logger: loggerMock.create(),
    context: {} as unknown as PluginInitializerContext,
    ...overwrites,
  } as unknown as ExportType;
};
