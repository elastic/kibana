/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  clearNodeSelection,
  createWorkspaceState,
  deleteSelectedNodes,
  deselectNode,
  groupSelectedNodes,
  invertNodeSelection,
  redoWorkspace,
  selectAllNodes,
  selectNeighborNodes,
  toggleNodeSelection,
  undoWorkspace,
  workspaceGraphMergeStarted,
  workspaceGraphMerged,
  workspaceRuntimeChanged,
} from '../../state_management/workspace';
import { createMockGraphStore } from '../../state_management/mocks';
import { createGraphStore } from '../../state_management/store';
import { createWorkspace } from './graph_client_workspace';

describe('graphui-workspace', function () {
  describe('createWorkspace()', function () {
    // var fooResource=null;
    let mockedResult = null;
    let init = null;
    const workspaces = [];
    afterEach(() => {
      workspaces.forEach((workspace) => workspace.stopLayout());
      workspaces.length = 0;
    });
    beforeEach(function () {
      //Setup logic here
      // fooResource={"foo":"bar"};
      init = function () {
        const changeHandler = jest.fn();
        const topologyChangeHandler = jest.fn();
        const graphMergeStarted = jest.fn();
        const callNodeProxy = function (indexName, query, responseHandler) {
          responseHandler(mockedResult);
        };
        const options = {
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
          graphMergeStarted,
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
        workspaces.push(workspace);
        const { mockedDeps } = createMockGraphStore({});
        mockedDeps.getWorkspace.mockReturnValue(workspace);
        const store = createGraphStore(mockedDeps);
        mockedDeps.notifyReact.mockImplementation(() =>
          store.dispatch(workspaceRuntimeChanged(createWorkspaceState(workspace)))
        );
        topologyChangeHandler.mockImplementation(() =>
          store.dispatch(workspaceGraphMerged(createWorkspaceState(workspace)))
        );
        graphMergeStarted.mockImplementation(() => store.dispatch(workspaceGraphMergeStarted()));
        return {
          workspace,
          store,
          changeHandler,
          topologyChangeHandler,
          //, get to(){}
        };
      };
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

      expect(topologyChangeHandler).toHaveBeenCalledTimes(1);
      expect(changeHandler).not.toHaveBeenCalled();
      expect(workspace.runLayout).toHaveBeenCalledTimes(1);
    });

    it('initializes edge layout references before snapshotting topology changes', function () {
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

        expect(topologyChangeHandler).toHaveBeenCalledTimes(1);
        const snapshot = topologyChangeHandler.mock.results[0].value;
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
      workspace.simpleSearch('myquery', undefined, 2);

      expect(workspace.nodes.length).toEqual(2);
      expect(workspace.edges.length).toEqual(1);
      expect(workspace.selectedNodes.length).toEqual(0);
      expect(workspace.blocklistedNodes.length).toEqual(0);

      const nodeA = workspace.getNode(workspace.makeNodeId('field1', 'a'));
      expect(typeof nodeA).toBe('object');

      const nodeD = workspace.getNode(workspace.makeNodeId('field1', 'd'));
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
      workspace.simpleSearch('myquery', undefined, 2);

      expect(workspace.nodes.length).toEqual(2);
      expect(workspace.edges.length).toEqual(1);
      expect(workspace.selectedNodes.length).toEqual(0);
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
      workspace.expandGraph();
      expect(workspace.nodes.length).toEqual(3); //we already had b from initial query
      expect(workspace.edges.length).toEqual(2);
    });

    it('selectionTest', function () {
      //Test selections on a graph
      const { workspace, store } = init();
      // graph is a1->a2 and b1->b2
      mockedResult = {
        vertices: [
          {
            field: 'field1',
            term: 'a1',
            weight: 1,
            depth: 0,
          },
          {
            field: 'field1',
            term: 'a2',
            weight: 1,
            depth: 1,
          },
          {
            field: 'field1',
            term: 'b1',
            weight: 1,
            depth: 1,
          },
          {
            field: 'field1',
            term: 'b2',
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
          {
            source: 2,
            target: 3,
            weight: 1,
            doc_count: 5,
          },
        ],
      };
      workspace.simpleSearch('myquery', undefined, 2);

      expect(workspace.selectedNodes.length).toEqual(0);

      const nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(typeof nodeA2).toEqual('object');
      const nodeB1 = workspace.getNode(workspace.makeNodeId('field1', 'b1'));
      expect(typeof nodeB1).toEqual('object');
      const nodeB2 = workspace.getNode(workspace.makeNodeId('field1', 'b2'));
      expect(typeof nodeB2).toEqual('object');

      expect(workspace.selectedNodes.length).toEqual(0);
      store.dispatch(toggleNodeSelection({ nodeId: nodeA1.id, replace: false }));
      expect(workspace.selectedNodes.length).toEqual(1);
      store.dispatch(invertNodeSelection());
      expect(workspace.selectedNodes.length).toEqual(3);
      store.dispatch(invertNodeSelection());
      expect(workspace.selectedNodes.length).toEqual(1);
      store.dispatch(deselectNode(nodeA1.id));
      expect(workspace.selectedNodes.length).toEqual(0);
      store.dispatch(selectAllNodes());
      expect(workspace.selectedNodes.length).toEqual(4);
      store.dispatch(invertNodeSelection());
      expect(workspace.selectedNodes.length).toEqual(0);

      store.dispatch(toggleNodeSelection({ nodeId: nodeA1.id, replace: false }));
      expect(workspace.selectedNodes.length).toEqual(1);
      store.dispatch(selectNeighborNodes());
      expect(workspace.selectedNodes.length).toEqual(2);
      store.dispatch(selectNeighborNodes());
      //Should have reached full extent of a1-a2 island.
      expect(workspace.selectedNodes.length).toEqual(2);
    });

    it('undoRedoDeletes', function () {
      const { workspace, store } = init();
      // graph is a1->a2
      mockedResult = {
        vertices: [
          {
            field: 'field1',
            term: 'a1',
            weight: 1,
            depth: 0,
          },
          {
            field: 'field1',
            term: 'a2',
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
      workspace.simpleSearch('myquery', undefined, 2);

      expect(workspace.nodes.length).toEqual(2);

      let nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(typeof nodeA2).toEqual('object');

      store.dispatch(toggleNodeSelection({ nodeId: nodeA1.id, replace: false }));
      store.dispatch(deleteSelectedNodes());
      expect(workspace.nodes.length).toEqual(1);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).toBe(undefined);

      store.dispatch(undoWorkspace());
      expect(workspace.nodes.length).toEqual(2);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');

      store.dispatch(redoWorkspace());
      expect(workspace.nodes.length).toEqual(1);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).toBe(undefined);

      store.dispatch(undoWorkspace());
      expect(workspace.nodes.length).toEqual(2);
    });

    it('undoRedoGroupings', function () {
      const { workspace, store } = init();
      // graph is a1->a2
      mockedResult = {
        vertices: [
          {
            field: 'field1',
            term: 'a1',
            weight: 1,
            depth: 0,
          },
          {
            field: 'field1',
            term: 'a2',
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
      workspace.simpleSearch('myquery', undefined, 2);

      expect(workspace.nodes.length).toEqual(2);

      let nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(typeof nodeA2).toEqual('object');

      store.dispatch(toggleNodeSelection({ nodeId: nodeA2.id, replace: false }));
      store.dispatch(groupSelectedNodes(nodeA1.id));

      let groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(2);
      store.dispatch(undoWorkspace());
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(1);
      store.dispatch(redoWorkspace());
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(2);

      //Grouped deletes delete all grouped items
      store.dispatch(clearNodeSelection());
      store.dispatch(toggleNodeSelection({ nodeId: nodeA1.id, replace: false }));
      store.dispatch(deleteSelectedNodes());
      expect(workspace.nodes.length).toEqual(0);
      expect(workspace.selectedNodes.length).toEqual(0);

      store.dispatch(undoWorkspace());
      expect(workspace.nodes.length).toEqual(2);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(2);
    });
  });
});
