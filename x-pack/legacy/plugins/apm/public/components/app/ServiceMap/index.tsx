/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { useMemo, useEffect, useState, useRef } from 'react';
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

  const getNext = (input: { reset?: boolean; after?: string | undefined }) => {
    const { start, end, uiFilters: strippedUiFilters, ...query } = params;

    if (input.reset) {
      setResponses([]);
    }

    if (start && end) {
      setIsLoading(true);
      callApmApi({
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
      })
        .then(data => {
          setResponses(resp => resp.concat(data));
          setIsLoading(false);

          const shouldGetNext =
            responses.length + 1 < MAX_REQUESTS && data.after;

          if (shouldGetNext) {
            getNext({ after: data.after });
          }
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  };

  const _getNext = async (input: {
    after?: string | undefined;
    start?: string;
    end?: string;
  }) => {
    const { uiFilters: strippedUiFilters, ...query } = params;
    if (!(input.start && input.end)) {
      return;
    }
    setIsLoading(true);
    try {
      const data = await callApmApi({
        pathname: '/api/apm/service-map',
        params: {
          query: {
            ...query,
            start: input.start,
            end: input.end,
            uiFilters: JSON.stringify(strippedUiFilters),
            after: input.after
          }
        }
      });
      setResponses(resp => resp.concat(data));
      setIsLoading(false);

      const shouldGetNext = responses.length + 1 < MAX_REQUESTS && data.after;

      if (shouldGetNext) {
        percentageLoadedRef.current += 5;
        setPercentageLoaded(percentageLoadedRef.current);
        await _getNext({ ...input, after: data.after });
      }
    } catch (error) {
      setIsLoading(false);
    }
  };
  const getNextProgressive = async (input: { reset?: boolean }) => {
    const { start, end } = params;

    if (input.reset) {
      setResponses([]);
      percentageLoadedRef.current = 5;
      setPercentageLoaded(percentageLoadedRef.current);
    }

    await _getNext({
      start: datemath.parse('now-5m')?.toISOString(),
      end: datemath.parse('now')?.toISOString()
    });
    percentageLoadedRef.current = 20;
    setPercentageLoaded(percentageLoadedRef.current);
    await _getNext({
      start: datemath.parse('now-15m')?.toISOString(),
      end: datemath.parse('now-5m')?.toISOString(),
      after: 'top'
    });
    percentageLoadedRef.current = 40;
    setPercentageLoaded(percentageLoadedRef.current);
    await _getNext({
      start: datemath.parse('now-30m')?.toISOString(),
      end: datemath.parse('now-15m')?.toISOString(),
      after: 'top'
    });
    percentageLoadedRef.current = 60;
    setPercentageLoaded(percentageLoadedRef.current);
    await _getNext({
      start: datemath.parse('now-1h')?.toISOString(),
      end: datemath.parse('now-30m')?.toISOString(),
      after: 'top'
    });
    percentageLoadedRef.current = 80;
    setPercentageLoaded(percentageLoadedRef.current);
    if (start && end) {
      await _getNext({ start, end, after: 'top' });
    }
    percentageLoadedRef.current = 100;
    setPercentageLoaded(percentageLoadedRef.current);
  };

  useEffect(() => {
    // getNext({ reset: true });
    getNextProgressive({ reset: true });
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

  return isValidPlatinumLicense ? (
    <LoadingOverlay isLoading={isLoading} percentageLoaded={percentageLoaded}>
      <Cytoscape
        elements={elements}
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
