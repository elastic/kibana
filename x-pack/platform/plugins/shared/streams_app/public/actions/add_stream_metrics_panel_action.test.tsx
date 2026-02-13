/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { PresentationContainer } from '@kbn/presentation-containers';
import { createAddStreamMetricsPanelAction } from './add_stream_metrics_panel_action';
import type { StreamsAppStartDependencies } from '../types';
import { ADD_STREAM_METRICS_PANEL_ACTION_ID } from '../../common/embeddable';

describe('createAddStreamMetricsPanelAction', () => {
  const mockCoreStart = {} as CoreStart;
  const mockPluginsStart = {} as StreamsAppStartDependencies;

  const action = createAddStreamMetricsPanelAction(mockCoreStart, mockPluginsStart);

  describe('action definition', () => {
    // Create a mock context for testing
    const mockContext = { embeddable: {} };

    it('should have the correct id', () => {
      expect(action.id).toBe(ADD_STREAM_METRICS_PANEL_ACTION_ID);
    });

    it('should have a display name', () => {
      expect(action.getDisplayName?.(mockContext)).toBe('Stream metrics');
    });

    it('should have an icon type', () => {
      expect(action.getIconType?.(mockContext)).toBe('visGauge');
    });

    it('should have grouping', () => {
      expect(action.grouping).toBeDefined();
      expect(action.grouping?.length).toBe(1);
      expect(action.grouping?.[0].id).toBe('streams');
    });

    it('should have an order', () => {
      expect(action.order).toBe(10);
    });
  });

  describe('isCompatible', () => {
    it('should return true for presentation containers', async () => {
      // A PresentationContainer needs addNewPanel, removePanel, replacePanel, getPanelCount, getChildApi, and children$
      const mockContainer = {
        addNewPanel: jest.fn(),
        removePanel: jest.fn(),
        replacePanel: jest.fn(),
        getPanelCount: jest.fn(),
        getChildApi: jest.fn(),
        children$: { subscribe: jest.fn() },
      } as unknown as PresentationContainer;

      const result = await action.isCompatible?.({ embeddable: mockContainer });
      expect(result).toBe(true);
    });

    it('should return false for non-presentation containers', async () => {
      const mockNonContainer = {};

      const result = await action.isCompatible?.({ embeddable: mockNonContainer });
      expect(result).toBe(false);
    });

    it('should return false when only addNewPanel is present', async () => {
      const mockPartialContainer = {
        addNewPanel: jest.fn(),
      };

      const result = await action.isCompatible?.({ embeddable: mockPartialContainer });
      expect(result).toBe(false);
    });
  });
});
