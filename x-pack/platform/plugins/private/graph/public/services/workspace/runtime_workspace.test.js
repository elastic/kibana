/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkspace } from './runtime_workspace';
import { GraphLayoutController } from './graph_layout_controller';
import { makeNodeId } from './graph_merge_planner';
import { mergeRuntimeGraph } from './runtime_graph_merge';
import { transformExpandResponse, transformSearchResponse } from './graph_response_transformers';

describe('graphui-workspace', function () {
  describe('createWorkspace()', function () {
    // var fooResource=null;
    let mockedResult = null;
    let init = null;
    let runtimeSequence = 0;
    const vertexFields = [{ name: 'field1' }, { name: 'field2' }];
    const mergeGraph = (workspace, graph) => {
      runtimeSequence = mergeRuntimeGraph(workspace, graph, runtimeSequence);
    };
    const mergeSearchResult = (workspace) => {
      mergeGraph(workspace, transformSearchResponse(mockedResult, vertexFields));
    };
    const mergeExpandResult = (workspace) => {
      mergeGraph(workspace, transformExpandResponse(mockedResult, vertexFields));
    };

    beforeEach(function () {
      runtimeSequence = 0;
      //Setup logic here
      // fooResource={"foo":"bar"};
      init = function () {
        const callNodeProxy = function (indexName, query, responseHandler) {
          responseHandler(mockedResult);
        };
        const runtime = { workspace: undefined };
        const layoutController = new GraphLayoutController({
          getNodes: () => runtime.workspace?.nodes ?? [],
          getEdges: () => runtime.workspace?.edges ?? [],
        });
        const options = {
          layoutController,
          indexName: 'indexName',
          vertex_fields: vertexFields,
          graphExploreProxy: callNodeProxy,
          exploreControls: {
            useSignificance: false,
            sampleSize: 2000,
            timeoutMillis: 5000,
            sampleDiversityField: null,
            maxValuesPerDoc: 1,
            minDocCount: 1,
          },
        };
        const workspace = createWorkspace(options);
        runtime.workspace = workspace;
        return {
          workspace,
          //, get to(){}
        };
      };
    });
    it('starts layout after merging topology', function () {
      const layoutController = {
        stop: jest.fn(),
        start: jest.fn(),
        isRunning: jest.fn(() => false),
      };
      const workspace = createWorkspace({ layoutController });

      mergeGraph(workspace, { nodes: [], edges: [] });

      expect(layoutController.start).toHaveBeenCalled();
    });

    it('initializeWorkspace', function () {
      const { workspace } = init();
      expect(workspace.nodes.length).toEqual(0);
    });
    it('simpleSearch', function () {
      //Test that a graph is loaded from a free-text search
      const { workspace } = init();

      mockedResult = {
        vertices: [
          {
            field: 'field1',
            term: 'a',
            weight: 1,
            depth: 0,
          },
          {
            field: 'field1',
            term: 'b',
            weight: 1,
            depth: 1,
          },
        ],
        connections: [
          {
            source: 0,
            target: 1,
            weight: 1,
            doc_count: 5,
          },
        ],
      };
      mergeSearchResult(workspace);

      expect(workspace.nodes.length).toEqual(2);
      expect(workspace.edges.length).toEqual(1);
      expect(workspace.blocklistedNodes.length).toEqual(0);

      const nodeA = workspace.nodesMap[makeNodeId('field1', 'a')];
      expect(typeof nodeA).toBe('object');

      const nodeD = workspace.nodesMap[makeNodeId('field1', 'd')];
      expect(nodeD).toBe(undefined);
    });

    it('expandTest', function () {
      //Test that a graph can be expanded
      const { workspace } = init();

      mockedResult = {
        vertices: [
          {
            field: 'field1',
            term: 'a',
            weight: 1,
            depth: 0,
          },
          {
            field: 'field1',
            term: 'b',
            weight: 1,
            depth: 1,
          },
        ],
        connections: [
          {
            source: 0,
            target: 1,
            weight: 1,
            doc_count: 5,
          },
        ],
      };
      mergeSearchResult(workspace);

      expect(workspace.nodes.length).toEqual(2);
      expect(workspace.edges.length).toEqual(1);
      expect(workspace.blocklistedNodes.length).toEqual(0);

      mockedResult = {
        vertices: [
          {
            field: 'field1',
            term: 'b',
            weight: 1,
            depth: 0,
          },
          {
            field: 'field1',
            term: 'c',
            weight: 1,
            depth: 1,
          },
        ],
        connections: [
          {
            source: 0,
            target: 1,
            weight: 1,
            doc_count: 5,
          },
        ],
      };
      mergeExpandResult(workspace);
      expect(workspace.nodes.length).toEqual(3); //we already had b from initial query
      expect(workspace.edges.length).toEqual(2);
    });
  });
});
