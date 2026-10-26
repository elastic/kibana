/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduxStateToSavedWorkspace } from './serialize';
import type {
  GraphWorkspaceSavedObject,
  UrlTemplate,
  AdvancedSettings,
  WorkspaceField,
} from '../../types';
import { outlinkEncoders } from '../../helpers/outlink_encoders';
import type { IndexpatternDatasource, WorkspaceState } from '../../state_management';

describe('serialize', () => {
  let appState: {
    workspace: WorkspaceState;
    urlTemplates: UrlTemplate[];
    advancedSettings: AdvancedSettings;
    selectedIndex: IndexpatternDatasource;
    selectedFields: WorkspaceField[];
  };

  beforeEach(() => {
    appState = {
      advancedSettings: {
        useSignificance: true,
        sampleSize: 2000,
        timeoutMillis: 5000,
        maxValuesPerDoc: 1,
        minDocCount: 3,
      },
      selectedFields: [
        {
          color: 'black',
          icon: { id: 'a', package: 'eui', label: '', prevName: '' },
          name: 'field1',
          selected: true,
          type: 'string',
          aggregatable: true,
        },
        {
          color: 'black',
          icon: { id: 'b', package: 'eui', label: '', prevName: '' },
          name: 'field2',
          selected: true,
          type: 'string',
          aggregatable: true,
        },
      ],
      selectedIndex: {
        type: 'indexpattern',
        id: '123',
        title: 'Testindexpattern',
      },
      urlTemplates: [
        {
          description: 'Template',
          encoder: outlinkEncoders[0],
          icon: { id: 'd', package: 'eui', label: '', prevName: '' },
          url: 'test-url',
        },
      ],
      workspace: {
        isInitialized: true,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        nodesById: {
          'node-0': {
            id: 'node-0',
            color: 'black',
            data: { field: 'field1', term: 'A' },
            label: 'A',
            x: 1,
            y: 2,
            scaledSize: 10,
          },
          'node-1': {
            id: 'node-1',
            parentId: 'node-2',
            color: 'black',
            data: { field: 'field1', term: 'B' },
            label: 'B',
            x: 3,
            y: 4,
            scaledSize: 10,
          },
          'node-2': {
            id: 'node-2',
            color: 'black',
            data: { field: 'field1', term: 'C' },
            label: 'B',
            x: 5,
            y: 6,
            scaledSize: 10,
          },
          'node-3': {
            id: 'node-3',
            parentId: 'node-2',
            color: 'black',
            data: { field: 'field2', term: 'D' },
            label: 'D',
            x: 7,
            y: 8,
            scaledSize: 10,
          },
          'node-4': {
            id: 'node-4',
            color: 'black',
            data: { field: 'field2', term: 'E' },
            label: 'E',
            x: 9,
            y: 10,
            scaledSize: 10,
          },
        },
        nodeIds: ['node-0', 'node-1', 'node-2', 'node-3', 'node-4'],
        edgesById: {
          'edge-0': {
            id: 'edge-0',
            sourceId: 'node-2',
            targetId: 'node-0',
            topSourceId: 'node-2',
            topTargetId: 'node-0',
            label: '',
            weight: 5,
            width: 5,
          },
          'edge-1': {
            id: 'edge-1',
            sourceId: 'node-2',
            targetId: 'node-4',
            topSourceId: 'node-2',
            topTargetId: 'node-4',
            label: '',
            weight: 5,
            width: 5,
          },
        },
        edgeIds: ['edge-0', 'edge-1'],
        blocklistedNodesById: {
          'blocked-0': {
            id: 'blocked-0',
            color: 'black',
            data: { field: 'field1', term: 'Z' },
            label: 'Z',
            x: 1,
            y: 2,
            scaledSize: 10,
          },
        },
        blocklistedNodeIds: ['blocked-0'],
      },
    };
  });

  it('should serialize normalized Redux workspace state', () => {
    const savedWorkspace = {} as GraphWorkspaceSavedObject;

    reduxStateToSavedWorkspace(savedWorkspace, appState, true);

    const workspaceState = JSON.parse(savedWorkspace.wsState);
    expect(workspaceState).toMatchInlineSnapshot(`
      Object {
        "blocklist": Array [
          Object {
            "color": "black",
            "field": "field1",
            "label": "Z",
            "parent": null,
            "size": 10,
            "term": "Z",
            "x": 1,
            "y": 2,
          },
        ],
        "exploreControls": Object {
          "maxValuesPerDoc": 1,
          "minDocCount": 3,
          "sampleSize": 2000,
          "timeoutMillis": 5000,
          "useSignificance": true,
        },
        "indexPattern": "123",
        "links": Array [
          Object {
            "label": "",
            "source": 2,
            "target": 0,
            "weight": 5,
            "width": 5,
          },
          Object {
            "label": "",
            "source": 2,
            "target": 4,
            "weight": 5,
            "width": 5,
          },
        ],
        "selectedFields": Array [
          Object {
            "color": "black",
            "iconClass": "a",
            "name": "field1",
            "selected": true,
          },
          Object {
            "color": "black",
            "iconClass": "b",
            "name": "field2",
            "selected": true,
          },
        ],
        "urlTemplates": Array [
          Object {
            "description": "Template",
            "encoderID": "kql-loose",
            "iconClass": "d",
            "url": "test-url",
          },
        ],
        "vertices": Array [
          Object {
            "color": "black",
            "field": "field1",
            "label": "A",
            "parent": null,
            "size": 10,
            "term": "A",
            "x": 1,
            "y": 2,
          },
          Object {
            "color": "black",
            "field": "field1",
            "label": "B",
            "parent": 2,
            "size": 10,
            "term": "B",
            "x": 3,
            "y": 4,
          },
          Object {
            "color": "black",
            "field": "field1",
            "label": "B",
            "parent": null,
            "size": 10,
            "term": "C",
            "x": 5,
            "y": 6,
          },
          Object {
            "color": "black",
            "field": "field2",
            "label": "D",
            "parent": 2,
            "size": 10,
            "term": "D",
            "x": 7,
            "y": 8,
          },
          Object {
            "color": "black",
            "field": "field2",
            "label": "E",
            "parent": null,
            "size": 10,
            "term": "E",
            "x": 9,
            "y": 10,
          },
        ],
      }
    `);
    expect(savedWorkspace.numVertices).toBe(5);
    expect(savedWorkspace.numLinks).toBe(2);
  });

  it('should not save data if set to false', () => {
    const savedWorkspace = {} as unknown as GraphWorkspaceSavedObject;

    reduxStateToSavedWorkspace(savedWorkspace, appState, false);

    const workspaceState = JSON.parse(savedWorkspace.wsState);
    expect(workspaceState.vertices).toHaveLength(0);
    expect(workspaceState.links).toHaveLength(0);
    expect(workspaceState.blocklist).toHaveLength(0);
    expect(savedWorkspace.numVertices).toBe(0);
    expect(savedWorkspace.numLinks).toBe(0);
  });
});
