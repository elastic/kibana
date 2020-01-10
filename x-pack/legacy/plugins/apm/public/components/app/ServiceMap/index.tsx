/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { find, isEqual, sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { ValuesType } from 'utility-types';
import { ElementDefinition } from 'cytoscape';
import { toMountPoint } from '../../../../../../../../src/plugins/kibana_react/public';
import { ServiceMapAPIResponse } from '../../../../server/lib/service_map/get_service_map';
import {
  Connection,
  ServiceConnectionNode,
  ConnectionNode
} from '../../../../common/service_map';
import { useLicense } from '../../../hooks/useLicense';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Controls } from './Controls';
import { Cytoscape } from './Cytoscape';
import { PlatinumLicensePrompt } from './PlatinumLicensePrompt';
import { useCallApmApi } from '../../../hooks/useCallApmApi';
import { useDeepObjectIdentity } from '../../../hooks/useDeepObjectIdentity';
import { getAPMHref } from '../../shared/Links/apm/APMLink';
import { useLocation } from '../../../hooks/useLocation';
import { LoadingOverlay } from './LoadingOverlay';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

interface ServiceMapProps {
  serviceName?: string;
}

const cytoscapeDivStyle = {
  height: '85vh',
  background: `linear-gradient(
  90deg,
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
linear-gradient(
  ${theme.euiPageBackgroundColor}
    calc(${theme.euiSizeL} - calc(${theme.euiSizeXS} / 2)),
  transparent 1%
)
center,
${theme.euiColorLightShade}`,
  backgroundSize: `${theme.euiSizeL} ${theme.euiSizeL}`,
  margin: `-${theme.gutterTypes.gutterLarge}`
};

const MAX_REQUESTS = 5;

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

export function ServiceMap({ serviceName }: ServiceMapProps) {
  const { urlParams, uiFilters } = useUrlParams();
  const { notifications } = useApmPluginContext().core;

  const [, _setUnusedState] = useState(false);

  const forceUpdate = () => _setUnusedState(value => !value);

  const callApmApi = useCallApmApi();

  const params = useDeepObjectIdentity({
    start: urlParams.start,
    end: urlParams.end,
    environment: urlParams.environment,
    serviceName,
    uiFilters: {
      ...uiFilters,
      environment: undefined
    }
  });

  const [responses, setResponses] = useState<ServiceMapAPIResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const percentageLoadedRef = useRef(0);
  const [percentageLoaded, setPercentageLoaded] = useState(
    percentageLoadedRef.current
  );

  const { search } = useLocation();

  const getNext = async (input: {
    reset?: boolean;
    after?: string | undefined;
  }) => {
    const { start, end, uiFilters: strippedUiFilters, ...query } = params;

    if (input.reset) {
      renderedElements.current = [];
      setResponses([]);
    }

    if (start && end) {
      setIsLoading(true);
      try {
        const data = await callApmApi({
          pathname: '/api/apm/service-map',
          params: {
            query: {
              ...query,
              start,
              end,
              uiFilters: JSON.stringify(strippedUiFilters),
              after: input.after
            }
          }
        });
        setResponses(resp => resp.concat(data));
        setIsLoading(false);

        const shouldGetNext = responses.length + 1 < MAX_REQUESTS && data.after;

        if (shouldGetNext) {
          percentageLoadedRef.current += 30;
          setPercentageLoaded(percentageLoadedRef.current);
          await getNext({ after: data.after });
        }
      } catch (error) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    percentageLoadedRef.current = 5;
    setPercentageLoaded(percentageLoadedRef.current);

    getNext({ reset: true }).then(() => {
      percentageLoadedRef.current = 100;
      setPercentageLoaded(percentageLoadedRef.current);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const elements = useMemo(() => {
    const destMap = responses.reduce((prev, response) => {
      return {
        ...prev,
        ...response.destinationMap
      };
    }, {} as Record<string, ServiceConnectionNode>);

    const serviceNodes = responses
      .flatMap(response => response.services)
      .map(service => ({
        ...service,
        id: service['service.name']
      }));

    // maps destination.address to service.name if possible
    function getConnectionNode(node: ConnectionNode) {
      const mappedNode =
        ('destination.address' in node &&
          destMap[node['destination.address']]) ||
        node;

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
            agentName: node['agent.name'] || node['agent.name']
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
  }, [responses, search]);

  const license = useLicense();

  const isValidPlatinumLicense =
    license?.isActive &&
    (license?.type === 'platinum' || license?.type === 'trial');

  const renderedElements = useRef<ElementDefinition[]>([]);

  const openToast = useRef<string | null>(null);

  const newData = elements.filter(element => {
    return !find(renderedElements.current, el => isEqual(el, element));
  });

  const updateMap = () => {
    renderedElements.current = elements;
    if (openToast.current) {
      notifications.toasts.remove(openToast.current);
    }
    forceUpdate();
  };

  if (renderedElements.current.length === 0) {
    renderedElements.current = elements;
  } else if (newData.length && !openToast.current) {
    openToast.current = notifications.toasts.add({
      title: i18n.translate('xpack.apm.newServiceMapData', {
        defaultMessage: `Newly discovered connections are available.`
      }),
      onClose: () => {
        openToast.current = null;
      },
      toastLifeTimeMs: 24 * 60 * 60 * 1000,
      text: toMountPoint(
        <EuiButton onClick={updateMap}>
          {i18n.translate('xpack.apm.updateServiceMap', {
            defaultMessage: 'Update map'
          })}
        </EuiButton>
      )
    }).id;
  }

  useEffect(() => {
    return () => {
      if (openToast.current) {
        notifications.toasts.remove(openToast.current);
      }
    };
  }, [notifications.toasts]);

  return isValidPlatinumLicense ? (
    <LoadingOverlay isLoading={isLoading} percentageLoaded={percentageLoaded}>
      <Cytoscape
        elements={renderedElements.current}
        serviceName={serviceName}
        style={cytoscapeDivStyle}
      >
        <Controls />
      </Cytoscape>
    </LoadingOverlay>
  ) : (
    <PlatinumLicensePrompt />
  );
}
