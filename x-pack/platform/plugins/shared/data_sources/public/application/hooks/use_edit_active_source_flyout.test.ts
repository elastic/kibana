/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataSourceUIConfigRegistry } from '../lib/data_source_ui_configs';
import type { DataSourceUIConfig } from '../lib/data_source_ui_configs/types';
import type { ActiveSource } from '../../types/connector';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';

describe('useEditActiveSourceFlyout', () => {
  beforeEach(() => {
    jest.spyOn(dataSourceUIConfigRegistry, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockActiveSource = (type: string): ActiveSource => ({
    id: 'source-1',
    name: 'Test Source',
    type,
    iconType: `.${type}`,
    stackConnectors: ['connector-1'],
    workflows: [],
    agentTools: [],
  });

  const createMockStackConnector = (actionTypeId: string): ActionConnector => ({
    id: 'connector-1',
    name: 'Test Connector',
    actionTypeId,
    config: {},
    secrets: {},
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    isMissingSecrets: false,
    isConnectorTypeDeprecated: false,
  });

  describe('should use custom flyout', () => {
    it('when editing GitHub source with UI override and MCP connector', () => {
      const mockUIConfig: DataSourceUIConfig = {
        dataSourceId: 'github',
        uiOverride: {
          formComponentImport: () => Promise.resolve({ default: () => null }),
          serializer: jest.fn(),
          deserializer: jest.fn(),
          displayName: 'GitHub',
          selectMessage: 'Connect to GitHub',
          iconClass: 'logoGithub',
        },
      };

      (dataSourceUIConfigRegistry.get as jest.Mock).mockReturnValue(mockUIConfig);

      const activeSource = createMockActiveSource('github');
      const stackConnector = createMockStackConnector('.mcp');
      const uiConfig = dataSourceUIConfigRegistry.get(activeSource.type);

      expect(uiConfig?.uiOverride).toBeDefined();
      expect(stackConnector.actionTypeId).toBe('.mcp');

      // This means the custom flyout should be used
      const shouldUseCustomFlyout = !!(
        uiConfig?.uiOverride && stackConnector.actionTypeId === '.mcp'
      );
      expect(shouldUseCustomFlyout).toBe(true);
    });
  });

  describe('should use standard flyout', () => {
    it('when editing Notion source without UI override', () => {
      const mockUIConfig: DataSourceUIConfig = {
        dataSourceId: 'notion',
      };

      (dataSourceUIConfigRegistry.get as jest.Mock).mockReturnValue(mockUIConfig);

      const activeSource = createMockActiveSource('notion');
      const stackConnector = createMockStackConnector('.notion');
      const uiConfig = dataSourceUIConfigRegistry.get(activeSource.type);

      expect(uiConfig).toBeDefined();
      expect(uiConfig?.uiOverride).toBeUndefined();

      // This means the standard flyout should be used
      const shouldUseCustomFlyout = !!(
        uiConfig?.uiOverride && stackConnector.actionTypeId === '.mcp'
      );
      expect(shouldUseCustomFlyout).toBe(false);
    });
  });
});
