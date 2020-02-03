/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';
import { sortBy, isEqual } from 'lodash';
import { Connection, ConnectionNode } from '../../../../common/service_map';
import { ServiceMapAPIResponse } from '../../../../server/lib/service_map/get_service_map';
import { getAPMHref } from '../../shared/Links/apm/APMLink';

function getConnectionNodeId(node: ConnectionNode): string {
  if ('destination.address' in node) {
    // use a prefix to distinguish exernal destination ids from services
    return `>${node['destination.address']}`;
  }
  return node['service.name'];
}

function getConnectionId(connection: Connection) {
  return `${getConnectionNodeId(connection.source)}~${getConnectionNodeId(
    connection.destination
  )}`;
}
export function getCytoscapeElements(
  responses: ServiceMapAPIResponse[],
  search: string
) {
  const discoveredServices = responses.flatMap(
    response => response.discoveredServices
  );

  const serviceNodes = responses
    .flatMap(response => response.services)
    .map(service => ({
      ...service,
      id: service['service.name']
    }));

  // maps destination.address to service.name if possible
  function getConnectionNode(node: ConnectionNode) {
    let mappedNode: ConnectionNode | undefined;

    if ('destination.address' in node) {
      mappedNode = discoveredServices.find(map => isEqual(map.from, node))?.to;
    }

    if (!mappedNode) {
      mappedNode = node;
    }

    return {
      ...mappedNode,
      id: getConnectionNodeId(mappedNode)
    };
  }

  // build connections with mapped nodes
  const connections = responses
    .flatMap(response => response.connections)
    .map(connection => {
      const source = getConnectionNode(connection.source);
      const destination = getConnectionNode(connection.destination);

      return {
        source,
        destination,
        id: getConnectionId({ source, destination })
      };
    })
    .filter(connection => connection.source.id !== connection.destination.id);

  const nodes = connections
    .flatMap(connection => [connection.source, connection.destination])
    .concat(serviceNodes);

  type ConnectionWithId = ValuesType<typeof connections>;
  type ConnectionNodeWithId = ValuesType<typeof nodes>;

  const connectionsById = connections.reduce((connectionMap, connection) => {
    return {
      ...connectionMap,
      [connection.id]: connection
    };
  }, {} as Record<string, ConnectionWithId>);

  const nodesById = nodes.reduce((nodeMap, node) => {
    return {
      ...nodeMap,
      [node.id]: node
    };
  }, {} as Record<string, ConnectionNodeWithId>);

  const cyNodes = (Object.values(nodesById) as ConnectionNodeWithId[]).map(
    node => {
      let data = {};

      if ('service.name' in node) {
        data = {
          href: getAPMHref(
            `/services/${node['service.name']}/service-map`,
            search
          ),
          agentName: node['agent.name'] || node['agent.name'],
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
    }
  );

  // instead of adding connections in two directions,
  // we add a `bidirectional` flag to use in styling
  const dedupedConnections = (sortBy(
    Object.values(connectionsById),
    // make sure that order is stable
    'id'
  ) as ConnectionWithId[]).reduce<
    Array<ConnectionWithId & { bidirectional?: boolean }>
  >((prev, connection) => {
    const reversedConnection = prev.find(
      c =>
        c.destination.id === connection.source.id &&
        c.source.id === connection.destination.id
    );

    if (reversedConnection) {
      reversedConnection.bidirectional = true;
      return prev;
    }

    return prev.concat(connection);
  }, []);

  const cyEdges = dedupedConnections.map(connection => {
    return {
      group: 'edges' as const,
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
