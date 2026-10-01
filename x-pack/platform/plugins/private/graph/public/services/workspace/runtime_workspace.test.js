/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWorkspaceState } from '../../state_management/workspace';
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
    const mergeGraph = (workspace, graph) => {
      runtimeSequence = mergeRuntimeGraph(workspace, graph, runtimeSequence);
    };
    const mergeSearchResult = (workspace) => {
      mergeGraph(workspace, transformSearchResponse(mockedResult, workspace.options.vertex_fields));
    };
    const mergeExpandResult = (workspace) => {
      mergeGraph(workspace, transformExpandResponse(mockedResult, workspace.options.vertex_fields));
    };

    beforeEach(function () {
      runtimeSequence = 0;
      //Setup logic here
      // fooResource={"foo":"bar"};
      init = function () {
        const changeHandler = jest.fn();
        const topologyChangeHandler = jest.fn();
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
          vertex_fields: [
            {
              name: 'field1',
            },
            {
              name: 'field2',
            },
          ],
          changeHandler,
          topologyChangeHandler,
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
          changeHandler,
          topologyChangeHandler,
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
    it('notifies topology changes separately from layout ticks', function () {
      const { workspace, changeHandler, topologyChangeHandler } = init();
      workspace.runLayout = jest.fn();

      workspace.mergeGraph({
        nodes: [{ field: 'field1', term: 'a', weight: 1, depth: 0 }],
        edges: [],
      });

      expect(topologyChangeHandler).toHaveBeenCalledTimes(2);
      expect(changeHandler).not.toHaveBeenCalled();
      expect(workspace.runLayout).toHaveBeenCalledTimes(1);
    });

    it('snapshots new edges safely before and after layout initializes references', function () {
      const { workspace, topologyChangeHandler } = init();
      topologyChangeHandler.mockImplementation(() => createWorkspaceState(workspace));

      try {
        workspace.mergeGraph({
          nodes: [
            { field: 'field1', term: 'a', weight: 1, depth: 0 },
            { field: 'field1', term: 'b', weight: 1, depth: 1 },
          ],
          edges: [{ source: 0, target: 1, weight: 1, doc_count: 5 }],
        });

        expect(topologyChangeHandler).toHaveBeenCalledTimes(2);
        const snapshot = topologyChangeHandler.mock.results[1].value;
        const edge = snapshot.edgesById[snapshot.edgeIds[0]];
        expect(edge.topSourceId).toBe(workspace.nodes[0].id);
        expect(edge.topTargetId).toBe(workspace.nodes[1].id);
      } finally {
        workspace.stopLayout();
      }
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
