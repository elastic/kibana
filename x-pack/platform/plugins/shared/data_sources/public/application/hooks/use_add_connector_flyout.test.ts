/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataSourceUIConfigRegistry } from '../lib/data_source_ui_configs';
import type { DataSourceUIConfig } from '../lib/data_source_ui_configs/types';

describe('useAddConnectorFlyout - UI Override Detection', () => {
  beforeEach(() => {
    jest.spyOn(dataSourceUIConfigRegistry, 'get');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('should use custom flyout', () => {
    it('when GitHub data source type with MCP connector is selected', () => {
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

      const currentDataSourceType = 'github';
      const selectedConnectorType = '.mcp';
      const uiConfig = dataSourceUIConfigRegistry.get(currentDataSourceType);

      expect(uiConfig?.uiOverride).toBeDefined();
      expect(selectedConnectorType).toBe('.mcp');

      // The custom flyout should be used
      const shouldUseCustomFlyout = !!(uiConfig?.uiOverride && selectedConnectorType === '.mcp');
      expect(shouldUseCustomFlyout).toBe(true);
    });
  });

  describe('should use standard flyout', () => {
    it('when Notion connector is selected (no UI override)', () => {
      const mockUIConfig: DataSourceUIConfig = {
        dataSourceId: 'notion',
      };

      (dataSourceUIConfigRegistry.get as jest.Mock).mockReturnValue(mockUIConfig);

      const currentDataSourceType: string = 'notion';
      const selectedConnectorType: string = '.notion';
      const uiConfig = dataSourceUIConfigRegistry.get(currentDataSourceType);

      expect(uiConfig).toBeDefined();
      expect(uiConfig?.uiOverride).toBeUndefined();

      // The standard flyout should be used
      const shouldUseCustomFlyout = !!(uiConfig?.uiOverride && selectedConnectorType === '.mcp');
      expect(shouldUseCustomFlyout).toBe(false);
    });
  });
});
