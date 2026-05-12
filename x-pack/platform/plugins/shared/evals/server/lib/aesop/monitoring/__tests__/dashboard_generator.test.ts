/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DashboardGeneratorService } from '../dashboard_generator';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';

describe('DashboardGeneratorService', () => {
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: jest.Mocked<Logger>;
  let service: DashboardGeneratorService;

  beforeEach(() => {
    mockSavedObjectsClient = {
      create: jest.fn(),
      get: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SavedObjectsClientContract>;

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    service = new DashboardGeneratorService(mockSavedObjectsClient, mockLogger);
  });

  describe('createPerformanceMonitoringDashboard', () => {
    it('should create dashboard with correct structure', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      const dashboardId = await service.createPerformanceMonitoringDashboard();

      expect(dashboardId).toBe('aesop-performance-monitoring');
      expect(mockSavedObjectsClient.create).toHaveBeenCalledTimes(1);

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [type, , options] = createCall as [string, any, any];

      expect(type).toBe('dashboard');
      expect(options?.id).toBe('aesop-performance-monitoring');
      expect(options?.overwrite).toBe(true);
    });

    it('should create dashboard with all 8 panels', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [, attributes] = createCall as [string, any, any];

      const panels = JSON.parse(attributes.panelsJSON);
      expect(panels).toHaveLength(8);

      // Verify panel indices
      const panelIndices = panels.map((p: any) => p.panelIndex);
      expect(panelIndices).toEqual([
        'panel-0',
        'panel-1',
        'panel-2',
        'panel-3',
        'panel-4',
        'panel-5',
        'panel-6',
        'panel-7',
      ]);
    });

    it('should set correct dashboard metadata', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [, attributes] = createCall as [string, any, any];

      expect(attributes.title).toBe('AESOP: Autonomous Skill Discovery - Performance Monitoring');
      expect(attributes.description).toContain('Operational metrics');
      expect(attributes.timeRestore).toBe(true);
      expect(attributes.timeFrom).toBe('now-7d');
      expect(attributes.timeTo).toBe('now');
      expect(attributes.refreshInterval).toEqual({
        pause: false,
        value: 300000,
      });
    });

    it('should configure dashboard options correctly', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [, attributes] = createCall as [string, any, any];

      const options = JSON.parse(attributes.optionsJSON);
      expect(options).toEqual({
        useMargins: true,
        syncColors: true,
        syncCursor: true,
        syncTooltips: true,
        hidePanelTitles: false,
      });
    });

    it('should handle creation errors gracefully', async () => {
      const error = new Error('Failed to create dashboard');
      mockSavedObjectsClient.create.mockRejectedValue(error);

      await expect(service.createPerformanceMonitoringDashboard()).rejects.toThrow(
        'Failed to create dashboard'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP Dashboard] ❌ Failed to create dashboard')
      );
    });

    it('should log success message with dashboard ID', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP Dashboard] ✅ Dashboard created successfully')
      );
    });
  });

  describe('Panel Validation', () => {
    it('should create Skill Invocations panel with correct configuration', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [, attributes] = createCall as [string, any, any];
      const panels = JSON.parse(attributes.panelsJSON);

      const skillInvocationPanel = panels[0];
      expect(skillInvocationPanel.embeddableConfig.title).toBe('Skill Invocations (Last 7 Days)');
      expect(skillInvocationPanel.gridData).toEqual({ x: 0, y: 0, w: 24, h: 12 });
    });

    it('should create Approval Rate panel with correct configuration', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [, attributes] = createCall as [string, any, any];
      const panels = JSON.parse(attributes.panelsJSON);

      const approvalRatePanel = panels[2];
      expect(approvalRatePanel.embeddableConfig.title).toContain(
        'Approval Rate by Exploration Cycle'
      );
      expect(approvalRatePanel.gridData).toEqual({ x: 0, y: 12, w: 48, h: 15 });
    });

    it('should create Cost Efficiency panel with correct configuration', async () => {
      mockSavedObjectsClient.create.mockResolvedValue({
        type: 'dashboard',
        id: 'aesop-performance-monitoring',
        attributes: {},
        references: [],
      });

      await service.createPerformanceMonitoringDashboard();

      const createCall = mockSavedObjectsClient.create.mock.calls[0];
      const [, attributes] = createCall as [string, any, any];
      const panels = JSON.parse(attributes.panelsJSON);

      const costPanel = panels[7];
      expect(costPanel.embeddableConfig.title).toBe('Cost per Skill Generated');
      expect(costPanel.gridData).toEqual({ x: 36, y: 37, w: 12, h: 13 });
    });
  });
});
