/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { IUrlParams } from '../../../context/UrlParamsContext/types';

function elementId(serviceName: string, environment?: string) {
  return serviceName + '/' + (environment ? '/' + environment : '');
}

function label(serviceName: string, environment?: string) {
  return serviceName + (environment ? '/' + environment : '');
}

// interface Props {
//   connections: any;
// }
export function MapOfServices({ connections, layout }: any) {
  const services: { [s: string]: object } = {};
  const conns: Array<{ data: object }> = [];
  let destNodeID;
  connections.forEach(c => {
    if (c['callee.name']) {
      destNodeID = elementId(c['callee.name'], c['callee.environment']);
      const node = {
        data: {
          id: destNodeID,
          label: label(c['callee.name'], c['callee.environment']),
          color: 'black'
        }
      };
      services[destNodeID] = node;
    } else {
      destNodeID = elementId(c['destination.address']);
      services[destNodeID] = {
        data: {
          id: destNodeID,
          label: label(c['destination.address'])
        }
      };
    }
    const sourceNodeID = elementId(c['service.name'], c['service.environment']);

    services[sourceNodeID] = {
      data: {
        id: sourceNodeID,
        label: label(c['service.name'], c['service.environment']),
        color: 'black'
      }
    };

    conns.push({
      data: {
        source: sourceNodeID,
        target: destNodeID,
        label: c['connection.subtype']
      }
    });
  });
  const elements = Object.values(services).concat(conns);
  //   const elements = [];
  //     { data: { id: 'one', label: 'Node 1' }},
  //     { data: { id: 'two', label: 'Node 2' }},
  //     { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } }
  //  ];
  const stylesheet = [
    {
      selector: 'node',
      style: {
        label: 'data(label)' // maps to data.label
      }
    },
    {
      selector: 'node[color]',
      style: {
        'background-color': 'data(color)'
      }
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        label: 'data(label)', // maps to data.label
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle'
      }
    }
  ];

  return (
    <CytoscapeComponent
      elements={elements}
      layout={{ name: layout }}
      stylesheet={stylesheet}
      style={{ width: '1024px', height: '600px' }}
    />
  );
}
