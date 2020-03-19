/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceMapAPIResponse } from '../../../../../../../plugins/apm/server/lib/service_map/get_service_map';
import { getAPMHref } from '../../shared/Links/apm/APMLink';

export function getCytoscapeElements(
  response: ServiceMapAPIResponse,
  search: string
) {
  const { nodes, connections } = response;

  const nodesById = nodes.reduce((nodeMap, node) => {
    return {
      ...nodeMap,
      [node.id]: node
    };
  }, {} as Record<string, ValuesType<typeof nodes>>);

  const cyNodes = (Object.values(nodesById) as Array<
    ValuesType<typeof nodes>
  >).map(node => {
    let data = {};

    if ('service.name' in node) {
      data = {
        href: getAPMHref(
          `/services/${node['service.name']}/service-map`,
          search
        ),
        agentName: node['agent.name'],
        frameworkName: node['service.framework.name'],
        type: 'service'
      };
    }

    if ('span.type' in node) {
      data = {
        // For nodes with span.type "db", convert it to "database". Otherwise leave it as-is.
        type: node['span.type'] === 'db' ? 'database' : node['span.type'],
        // Externals should not have a subtype so make it undefined if the type is external.
        subtype: node['span.type'] !== 'external' && node['span.subtype']
      };
    }

    return {
      group: 'nodes' as const,
      data: {
        id: node.id,
        label:
          'service.name' in node
            ? node['service.name']
            : node['destination.address'],
        ...data
      }
    };
  });

  const cyEdges = connections.map(connection => {
    return {
      group: 'edges' as const,
      classes: connection.isInverseEdge ? 'invisible' : undefined,
      data: {
        id: connection.id,
        source: connection.source.id,
        target: connection.destination.id,
        bidirectional: connection.bidirectional ? true : undefined
      }
    };
  }, []);

  return [...cyNodes, ...cyEdges];
}
