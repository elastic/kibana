/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { DataConnectorAttributes } from '../saved_objects';
import { convertSOtoAPIResponse } from './schema';

describe('convertSOtoAPIResponse', () => {
  it('should convert SavedObject to API response format', () => {
    const savedObject: SavedObject<DataConnectorAttributes> = {
      id: 'connector-123',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'My Notion Connector',
        type: 'notion',
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
      workflowIds: ['workflow-1', 'workflow-2'],
      toolIds: ['tool-1'],
    });
  });

  it('should handle empty arrays', () => {
    const savedObject: SavedObject<DataConnectorAttributes> = {
      id: 'connector-empty',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Empty Connector',
        type: 'github',
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
      workflowIds: [],
      toolIds: [],
    });
  });

  it('should handle minimal required fields', () => {
    const savedObject: SavedObject<DataConnectorAttributes> = {
      id: 'minimal-connector',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Minimal',
        type: 'slack',
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
      workflowIds: [],
      toolIds: [],
    });
  });

  it('should handle connectors with multiple stack connectors', () => {
    const savedObject: SavedObject<DataConnectorAttributes> = {
      id: 'multi-connector',
      type: 'data_connector',
      references: [],
      attributes: {
        name: 'Multi Stack Connector',
        type: 'custom',
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
      workflowIds: ['wf-1'],
      toolIds: ['t-1', 't-2'],
    });
  });
});
