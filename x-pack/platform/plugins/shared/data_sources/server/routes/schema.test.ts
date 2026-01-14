/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { DataSourceAttributes } from '../saved_objects';
import { convertSOtoAPIResponse } from './schema';

describe('convertSOtoAPIResponse', () => {
  it('should convert SavedObject to API response format', () => {
    const savedObject: SavedObject<DataSourceAttributes> = {
      id: 'connector-123',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'My Notion Connector',
        type: 'notion',
        config: {},
        createdAt: '2025-01-07T10:00:00.000Z',
        updatedAt: '2025-01-07T10:00:00.000Z',
        workflowIds: ['workflow-1', 'workflow-2'],
        toolIds: ['tool-1'],
        kscIds: ['ksc-789'],
      },
    };

    const result = convertSOtoAPIResponse(savedObject);

    expect(result).toEqual({
      id: 'connector-123',
      name: 'My Notion Connector',
      type: 'notion',
      stackConnectors: ['ksc-789'],
      workflows: ['workflow-1', 'workflow-2'],
      agentTools: ['tool-1'],
      createdAt: '2025-01-07T10:00:00.000Z',
      updatedAt: '2025-01-07T10:00:00.000Z',
    });
  });

  it('should handle empty arrays', () => {
    const savedObject: SavedObject<DataSourceAttributes> = {
      id: 'connector-empty',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Empty Connector',
        type: 'github',
        config: {},
        createdAt: '2025-01-07T10:00:00.000Z',
        updatedAt: '2025-01-07T10:00:00.000Z',
        workflowIds: [],
        toolIds: [],
        kscIds: [],
      },
    };

    const result = convertSOtoAPIResponse(savedObject);

    expect(result).toEqual({
      id: 'connector-empty',
      name: 'Empty Connector',
      type: 'github',
      stackConnectors: [],
      workflows: [],
      agentTools: [],
      createdAt: '2025-01-07T10:00:00.000Z',
      updatedAt: '2025-01-07T10:00:00.000Z',
    });
  });

  it('should handle minimal required fields', () => {
    const savedObject: SavedObject<DataSourceAttributes> = {
      id: 'minimal-connector',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Minimal',
        type: 'slack',
        config: {},
        createdAt: '2025-01-07T10:00:00.000Z',
        updatedAt: '2025-01-07T10:00:00.000Z',
        workflowIds: [],
        toolIds: [],
        kscIds: ['ksc-1'],
      },
    };

    const result = convertSOtoAPIResponse(savedObject);

    expect(result).toEqual({
      id: 'minimal-connector',
      name: 'Minimal',
      type: 'slack',
      stackConnectors: ['ksc-1'],
      workflows: [],
      agentTools: [],
      createdAt: '2025-01-07T10:00:00.000Z',
      updatedAt: '2025-01-07T10:00:00.000Z',
    });
  });

  it('should handle connectors with multiple stack connectors', () => {
    const savedObject: SavedObject<DataSourceAttributes> = {
      id: 'multi-connector',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Multi Stack Connector',
        type: 'custom',
        config: {},
        createdAt: '2025-01-07T10:00:00.000Z',
        updatedAt: '2025-01-07T10:00:00.000Z',
        workflowIds: ['wf-1'],
        toolIds: ['t-1', 't-2'],
        kscIds: ['ksc-1', 'ksc-2', 'ksc-3'],
      },
    };

    const result = convertSOtoAPIResponse(savedObject);

    expect(result).toEqual({
      id: 'multi-connector',
      name: 'Multi Stack Connector',
      type: 'custom',
      stackConnectors: ['ksc-1', 'ksc-2', 'ksc-3'],
      workflows: ['wf-1'],
      agentTools: ['t-1', 't-2'],
      createdAt: '2025-01-07T10:00:00.000Z',
      updatedAt: '2025-01-07T10:00:00.000Z',
    });
  });

  it('should use timestamps from attributes', () => {
    const savedObject: SavedObject<DataSourceAttributes> = {
      id: 'connector-with-timestamps',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Timestamped Connector',
        type: 'notion',
        config: {},
        createdAt: '2025-01-07T10:00:00.000Z',
        updatedAt: '2025-01-07T12:30:00.000Z',
        workflowIds: [],
        toolIds: [],
        kscIds: ['ksc-123'],
      },
    };

    const result = convertSOtoAPIResponse(savedObject);

    expect(result).toEqual({
      id: 'connector-with-timestamps',
      name: 'Timestamped Connector',
      type: 'notion',
      stackConnectors: ['ksc-123'],
      workflows: [],
      agentTools: [],
      createdAt: '2025-01-07T10:00:00.000Z',
      updatedAt: '2025-01-07T12:30:00.000Z',
    });
  });
});
