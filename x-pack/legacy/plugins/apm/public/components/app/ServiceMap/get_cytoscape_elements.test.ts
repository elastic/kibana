/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCytoscapeElements } from './get_cytoscape_elements';

describe('getCytoscapeElements', () => {
  describe('with an empty list', () => {
    it('returns an empty list', () => {
      expect(getCytoscapeElements([], '')).toEqual([]);
    });
  });

  describe('with an external and a service with the same destination.address', () => {
    it('only returns the service', () => {
      const responses = [
        {
          after: undefined,
          connections: [
            {
              source: {
                'service.environment': null,
                'service.name': 'client',
                'service.framework.name': null,
                'agent.name': 'js-base'
              },
              destination: {
                'destination.address': 'opbeans-node',
                'span.subtype': '',
                'span.type': 'resource'
              }
            },
            {
              source: {
                'service.environment': null,
                'service.name': 'client',
                'service.framework.name': null,
                'agent.name': 'js-base'
              },
              destination: {
                'service.environment': 'production',
                'service.name': 'opbeans-node',
                'service.framework.name': null,
                'agent.name': 'nodejs'
              }
            }
          ],
          discoveredServices: [],
          services: [
            {
              'service.name': 'client',
              'agent.name': 'js-base',
              'service.environment': null,
              'service.framework.name': null
            }
          ]
        }
      ];

      expect(getCytoscapeElements(responses, '')).toEqual([
        {
          group: 'nodes',
          data: {
            id: 'client',
            label: 'client',
            href:
              '#/services/client/service-map?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
            agentName: 'js-base',
            frameworkName: null,
            type: 'service'
          }
        },
        {
          group: 'nodes',
          data: {
            id: 'opbeans-node',
            label: 'opbeans-node',
            href:
              '#/services/opbeans-node/service-map?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0',
            agentName: 'nodejs',
            frameworkName: null,
            type: 'service'
          }
        },
        {
          group: 'edges',
          classes: undefined,
          data: {
            id: 'client~opbeans-node',
            source: 'client',
            target: 'opbeans-node',
            bidirectional: undefined
          }
        }
      ]);
    });
  });
});
