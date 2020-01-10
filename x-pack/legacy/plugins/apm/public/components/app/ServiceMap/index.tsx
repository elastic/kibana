/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { find } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
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

type Element =
  | {
      group: 'nodes';
      data: {
        id: string;
        agentName?: string;
        href?: string;
      };
    }
  | {
      group: 'edges';
      data: {
        id: string;
        source: string;
        target: string;
      };
    };

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

const MAX_REQUESTS = 15;

function getConnectionNodeId(
  node: ConnectionNode,
  destMap: Record<string, ServiceConnectionNode> = {}
): string {
  if ('destination.address' in node) {
    const mapped = destMap[node['destination.address']];
    return mapped
      ? getConnectionNodeId(mapped, destMap)
      : node['destination.address'];
  }
  return node['service.name'];
}

function getEdgeId(source: ConnectionNode, destination: ConnectionNode) {
  return `${getConnectionNodeId(source)}~${getConnectionNodeId(destination)}`;
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
  const [isInteractive, setIsInteractive] = useState(false);
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

    // Allow user interaction after 5 seconds regardless of load status
    setIsInteractive(false);
    setTimeout(() => {
      setIsInteractive(true);
    }, 5000);

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

    const services = responses.flatMap(response => response.services);

    const nodesById = responses
      .flatMap(response => response.connections)
      .flatMap(connection => [connection.source, connection.destination])
      .concat(services)
      .reduce((acc, node) => {
        const nodeId = getConnectionNodeId(node, destMap);

        return {
          ...acc,
          [nodeId]: destMap[nodeId] || node
        };
      }, {} as Record<string, ConnectionNode>);

    const edgesById = responses
      .flatMap(response => response.connections)
      .reduce((acc, connection) => {
        const source =
          nodesById[getConnectionNodeId(connection.source, destMap)];
        const destination =
          nodesById[getConnectionNodeId(connection.destination, destMap)];

        if (acc[getEdgeId(destination, source)]) {
          return {
            ...acc,
            [getEdgeId(destination, source)]: {
              source,
              destination,
              bidirectional: true
            }
          };
        }

        return {
          ...acc,
          [getEdgeId(source, destination)]: {
            source,
            destination
          }
        };
      }, {} as Record<string, Connection>);

    return [
      ...(Object.values(nodesById) as ConnectionNode[]).map(node => {
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
            id: getConnectionNodeId(node, destMap),
            ...data
          }
        };
      }),
      ...(Object.values(edgesById) as Connection[])
        .filter(connection => connection.source !== connection.destination)
        .map(connection => {
          return {
            group: 'edges' as const,
            data: {
              id: getEdgeId(connection.source, connection.destination),
              source: getConnectionNodeId(connection.source, destMap),
              target: getConnectionNodeId(connection.destination, destMap)
            },
            style: connection.bidirectional
              ? {
                  'source-arrow-shape': 'triangle',
                  'target-arrow-shape': 'triangle',
                  'source-distance-from-node': theme.paddingSizes.xs,
                  'target-distance-from-node': theme.paddingSizes.xs
                }
              : {
                  'source-arrow-shape': 'none',
                  'target-arrow-shape': 'triangle',
                  'target-distance-from-node': theme.paddingSizes.xs
                }
          };
        })
    ];
  }, [responses, search]);

  const license = useLicense();

  const isValidPlatinumLicense =
    license?.isActive &&
    (license?.type === 'platinum' || license?.type === 'trial');

  const renderedElements = useRef<Element[]>([]);

  const openToast = useRef<string | null>(null);

  const newData = elements.filter(element => {
    return !find(
      renderedElements.current,
      el => el.data.id === element.data.id
    );
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
    if (isInteractive) {
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
    } else {
      updateMap();
    }
  }

  useEffect(() => {
    return () => {
      if (openToast.current) {
        notifications.toasts.remove(openToast.current);
      }
    };
  }, [notifications.toasts]);

  return isValidPlatinumLicense ? (
    <LoadingOverlay
      isLoading={isLoading}
      percentageLoaded={percentageLoaded}
      isInteractive={isInteractive}
    >
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
