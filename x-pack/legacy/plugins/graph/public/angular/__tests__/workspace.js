/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const gws = require('../graph_client_workspace.js');
const expect = require('@kbn/expect');
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
      expect(workspace.nodes).to.have.length(0);
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

      expect(workspace.nodes).to.have.length(2);
      expect(workspace.edges).to.have.length(1);
      expect(workspace.selectedNodes).to.have.length(0);
      expect(workspace.blacklistedNodes).to.have.length(0);

      const nodeA = workspace.getNode(workspace.makeNodeId('field1', 'a'));
      expect(nodeA).to.be.an(Object);

      const nodeD = workspace.getNode(workspace.makeNodeId('field1', 'd'));
      expect(nodeD).to.be(undefined);
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

      expect(workspace.nodes).to.have.length(2);
      expect(workspace.edges).to.have.length(1);
      expect(workspace.selectedNodes).to.have.length(0);
      expect(workspace.blacklistedNodes).to.have.length(0);

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
      expect(workspace.nodes).to.have.length(3); //we already had b from initial query
      expect(workspace.edges).to.have.length(2);
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

      expect(workspace.selectedNodes).to.have.length(0);

      const nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).to.be.an(Object);
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(nodeA2).to.be.an(Object);
      const nodeB1 = workspace.getNode(workspace.makeNodeId('field1', 'b1'));
      expect(nodeB1).to.be.an(Object);
      const nodeB2 = workspace.getNode(workspace.makeNodeId('field1', 'b2'));
      expect(nodeB2).to.be.an(Object);

      expect(workspace.selectedNodes).to.have.length(0);
      workspace.selectNode(nodeA1);
      expect(workspace.selectedNodes).to.have.length(1);
      workspace.selectInvert();
      expect(workspace.selectedNodes).to.have.length(3);
      workspace.selectInvert();
      expect(workspace.selectedNodes).to.have.length(1);
      workspace.deselectNode(nodeA1);
      expect(workspace.selectedNodes).to.have.length(0);
      workspace.selectAll();
      expect(workspace.selectedNodes).to.have.length(4);
      workspace.selectInvert();
      expect(workspace.selectedNodes).to.have.length(0);

      workspace.selectNode(nodeA1);
      expect(workspace.selectedNodes).to.have.length(1);
      workspace.selectNeighbours();
      expect(workspace.selectedNodes).to.have.length(2);
      workspace.selectNeighbours();
      //Should have reached full extent of a1-a2 island.
      expect(workspace.selectedNodes).to.have.length(2);
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

      expect(workspace.nodes).to.have.length(2);

      let nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).to.be.an(Object);
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(nodeA2).to.be.an(Object);

      workspace.selectNode(nodeA1);
      workspace.deleteSelection();
      expect(workspace.nodes).to.have.length(1);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).to.be(undefined);

      workspace.undo();
      expect(workspace.nodes).to.have.length(2);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).to.be.an(Object);

      workspace.redo();
      expect(workspace.nodes).to.have.length(1);
      nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).to.be(undefined);

      workspace.undo();
      expect(workspace.nodes).to.have.length(2);
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

      expect(workspace.nodes).to.have.length(2);

      const nodeA1 = workspace.getNode(workspace.makeNodeId('field1', 'a1'));
      expect(nodeA1).to.be.an(Object);
      const nodeA2 = workspace.getNode(workspace.makeNodeId('field1', 'a2'));
      expect(nodeA2).to.be.an(Object);

      workspace.selectNode(nodeA2);
      workspace.mergeSelections(nodeA1);

      let groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems).to.have.length(2);
      workspace.undo();
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems).to.have.length(1);
      workspace.redo();
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems).to.have.length(2);

      //Grouped deletes delete all grouped items
      workspace.selectNone();
      workspace.selectNode(nodeA1);
      workspace.deleteSelection();
      expect(workspace.nodes).to.have.length(0);
      expect(workspace.selectedNodes).to.have.length(0);

      workspace.undo();
      expect(workspace.nodes).to.have.length(2);
      groupedItems = workspace.returnUnpackedGroupeds([nodeA1]);
      expect(groupedItems).to.have.length(2);
    });
  });
});
