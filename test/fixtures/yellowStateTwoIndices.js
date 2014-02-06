define(function () {
  'use strict';
  return function () {
    return {
      status: 'yellow',
      nodes: {
        'node-1':  {
          name: 'The First Node',
          transport_address: 'inet[localhost/127.0.0.1:9300]',
          attributes: {}
        }
      },
      routing_nodes: {
        unassigned: [
          { 
            state: "UNASSIGNED",
            primary: false,
            node: "node-1",
            relocating_node: null,
            shard: 0,
            index: 'test-2014.01.01'
          },
          { 
            state: "UNASSIGNED",
            primary: false,
            node: null,
            relocating_node: null,
            shard: 1,
            index: 'test-2014.01.01'
          },
          { 
            state: "UNASSIGNED",
            primary: false,
            node: "node-1",
            relocating_node: null,
            shard: 0,
            index: 'test-2014.01.02'
          },
          { 
            state: "UNASSIGNED",
            primary: false,
            node: null,
            relocating_node: null,
            shard: 1,
            index: 'test-2014.01.02'
          }
        ],
        nodes: {
          'node-1': [
            { 
              state: "STARTED",
              primary: true,
              node: "node-1",
              relocating_node: null,
              shard: 0,
              index: 'test-2014.01.01'
            },
            { 
              state: "STARTED",
              primary: true,
              node: "node-1",
              relocating_node: null,
              shard: 1,
              index: 'test-2014.01.01'
            },
            { 
              state: "STARTED",
              primary: true,
              node: "node-1",
              relocating_node: null,
              shard: 0,
              index: 'test-2014.01.02'
            },
            { 
              state: "STARTED",
              primary: true,
              node: "node-1",
              relocating_node: null,
              shard: 1,
              index: 'test-2014.01.02'
            }
          ]
        }
      }
    };
  };
});

