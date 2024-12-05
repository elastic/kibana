/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appStateToSavedWorkspace } from './serialize';
import {
  GraphWorkspaceSavedObject,
  Workspace,
  WorkspaceEdge,
  UrlTemplate,
  AdvancedSettings,
  WorkspaceField,
} from '../../types';
import { outlinkEncoders } from '../../helpers/outlink_encoders';
import { IndexpatternDatasource } from '../../state_management';

describe('serialize', () => {
  let appState: {
    workspace: Workspace;
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
        nodes: [
          {
            color: 'black',
            data: { field: 'field1', term: 'A' },
            icon: { id: 'a', package: 'eui' },
            label: 'A',
            x: 1,
            y: 2,
            scaledSize: 10,
            parent: null,
          },
          {
            color: 'black',
            data: { field: 'field1', term: 'B' },
            icon: { id: 'a', package: 'eui' },
            label: 'B',
            x: 3,
            y: 4,
            scaledSize: 10,
            parent: null,
          },
          {
            color: 'black',
            data: { field: 'field1', term: 'C' },
            icon: { id: 'a', package: 'eui' },
            label: 'B',
            x: 5,
            y: 6,
            scaledSize: 10,
            parent: null,
          },
          {
            color: 'black',
            data: { field: 'field2', term: 'D' },
            icon: { id: 'a', package: 'eui' },
            label: 'D',
            x: 7,
            y: 8,
            scaledSize: 10,
            parent: null,
          },
          {
            color: 'black',
            data: { field: 'field2', term: 'E' },
            icon: { id: 'a', package: 'eui' },
            label: 'E',
            x: 9,
            y: 10,
            scaledSize: 10,
            parent: null,
          },
        ],
        blocklistedNodes: [
          {
            color: 'black',
            data: { field: 'field1', term: 'Z' },
            icon: { id: 'a', package: 'eui' },
            label: 'Z',
            x: 1,
            y: 2,
            scaledSize: 10,
            parent: null,
          },
        ],
        edges: [] as WorkspaceEdge[],
      } as Workspace,
    };

    // C is parent of B and D
    appState.workspace.nodes[3].parent = appState.workspace.nodes[2];
    appState.workspace.nodes[1].parent = appState.workspace.nodes[2];

    // A <-> C
    appState.workspace.edges.push({
      label: '',
      source: appState.workspace.nodes[2],
      target: appState.workspace.nodes[0],
      weight: 5,
      width: 5,
    } as WorkspaceEdge);

    // C <-> E
    appState.workspace.edges.push({
      label: '',
      source: appState.workspace.nodes[2],
      target: appState.workspace.nodes[4],
      weight: 5,
      width: 5,
    } as WorkspaceEdge);
  });

  it('should serialize given workspace', () => {
    const savedWorkspace = {} as unknown as GraphWorkspaceSavedObject;

    appStateToSavedWorkspace(savedWorkspace, appState, true);

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
  });

  it('should not save data if set to false', () => {
    const savedWorkspace = {} as unknown as GraphWorkspaceSavedObject;

    appStateToSavedWorkspace(savedWorkspace, appState, false);

    const workspaceState = JSON.parse(savedWorkspace.wsState);
    expect(workspaceState.vertices.length).toEqual(0);
    expect(workspaceState.links.length).toEqual(0);
  });
});
