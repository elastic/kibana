/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function () {
  'use strict';
  return function () {
    return {
      _id: new Date().getTime()+Math.random(), 
      status: 'green',
      nodes: {
        'node-1':  {
          name: 'The First Node',
          transport_address: 'inet[localhost/127.0.0.1:9300]',
          attributes: {}
        },
        'node-2':  {
          name: 'The Second Node',
          transport_address: 'inet[localhost/127.0.0.1:9301]',
          attributes: {}
        },
        'node-3':  {
          name: 'The Third Node',
          transport_address: 'inet[localhost/127.0.0.1:9301]',
          attributes: {}
        }
      },
      routing_nodes: {
        unassigned: [
        ],
        nodes: {
          'node-1': [
            { 
              state: "STARTED",
              primary: true,
              node: 'node-1',
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
              primary: false,
              node: 'node-2',
              relocating_node: null,
              shard: 0,
              index: 'test-2014.01.01'
            },
            { 
              state: "RELOCATING",
              primary: false,
              node: 'node-2',
              relocating_node: 'node-3',
              shard: 1,
              index: 'test-2014.01.01'
            },
            { 
              state: "INITIALIZING",
              primary: false,
              node: 'node-3',
              relocating_node: 'node-2',
              shard: 1,
              index: 'test-2014.01.01'
            }
          ]
        }
      }
    };
  };
});
  

