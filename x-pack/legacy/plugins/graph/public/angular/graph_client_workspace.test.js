/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gws from './graph_client_workspace';

describe('graphui-workspace', function() {
  describe('createWorkspace()', function() {
    // var fooResource=null;
    let mockedResult = null;
    let init = null;
    beforeEach(function() {
      //Setup logic here
      // fooResource={"foo":"bar"};
      init = function() {
        const callNodeProxy = function(indexName, query, responseHandler) {
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
        const workspace = gws.createWorkspace(options);
        return {
          workspace,
          //, get to(){}
        };
      };
    });
    it('initializeWorkspace', function() {
      const { workspace } = init();
      expect(workspace.nodes.length).toEqual(0);
    });
    it('simpleSearch', function() {
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
      workspace.simpleSearch('myquery', {}, 2);

      expect(workspace.nodes.length).toEqual(2);
      expect(workspace.edges.length).toEqual(1);
      expect(workspace.selectedNodes).toEqual(0);
      expect(workspace.blacklistedNodes).toEqual(0);

      const nodeA = workspace.getNode(workspace.makeNodeId('field1', 'a'));
      expect(typeof nodeA).toBe('object');

      const nodeD = workspace.getNode(workspace.makeNodeId('field1', 'd'));
      expect(nodeD).toBe(undefined);
    });

    it('expandTest', function() {
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
      workspace.simpleSearch('myquery', {}, 2);

      expect(workspace.nodes.length).toEqual(2);
      expect(workspace.edges.length).toEqual(1);
      expect(workspace.selectedNodes.length).toEqual(0);
      expect(workspace.blacklistedNodes.length).toEqual(0);

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

    it('selectionTest', function() {
      //Test selections on a graph
      const { workspace } = init();
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
      workspace.simpleSearch('myquery', {}, 2);

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
      workspace.selectNode(nodeA1);
      expect(workspace.selectedNodes.length).toEqual(1);
      workspace.selectInvert();
      expect(workspace.selectedNodes.length).toEqual(3);
      workspace.selectInvert();
      expect(workspace.selectedNodes.length).toEqual(1);
      workspace.deselectNode(nodeA1);
      expect(workspace.selectedNodes.length).toEqual(0);
      workspace.selectAll();
      expect(workspace.selectedNodes.length).toEqual(4);
      workspace.selectInvert();
      expect(workspace.selectedNodes.length).toEqual(0);

      workspace.selectNode(nodeA1);
      expect(workspace.selectedNodes.length).toEqual(1);
      workspace.selectNeighbours();
      expect(workspace.selectedNodes.length).toEqual(2);
      workspace.selectNeighbours();
      //Should have reached full extent of a1-a2 island.
      expect(workspace.selectedNodes.length).toEqual(2);
    });

    it('undoRedoDeletes', function() {
      const { workspace } = init();
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
      workspace.simpleSearch('myquery', {}, 2);

      expect(workspace.nodes.length).toEqual(2);

      let nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(typeof nodeA2).toEqual('object');

      workspace.selectNode(nodeA1);
      workspace.deleteSelection();
      expect(workspace.nodes.length).toEqual(1);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).toBe(undefined);

      workspace.undo();
      expect(workspace.nodes.length).toEqual(2);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');

      workspace.redo();
      expect(workspace.nodes.length).toEqual(1);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).toBe(undefined);

      workspace.undo();
      expect(workspace.nodes.length).toEqual(2);
    });

    it('undoRedoGroupings', function() {
      const { workspace } = init();
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
      workspace.simpleSearch('myquery', {}, 2);

      expect(workspace.nodes.length).toEqual(2);

      const nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(typeof nodeA1).toEqual('object');
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(typeof nodeA2).toEqual('object');

      workspace.selectNode(nodeA2);
      workspace.mergeSelections(nodeA1);

      let groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(2);
      workspace.undo();
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(1);
      workspace.redo();
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(2);

      //Grouped deletes delete all grouped items
      workspace.selectNone();
      workspace.selectNode(nodeA1);
      workspace.deleteSelection();
      expect(workspace.nodes.length).toEqual(0);
      expect(workspace.selectedNodes.length).toEqual(0);

      workspace.undo();
      expect(workspace.nodes.length).toEqual(2);
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems.length).toEqual(2);
    });
  });
});
