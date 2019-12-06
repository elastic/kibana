/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceConnection } from './run_service_map_task';

export function mapServiceConnectionToBulkIndex({
  serviceConnsDestinationIndex,
  serviceConnsDestinationPipeline,
  servicesInTrace
}: {
  serviceConnsDestinationIndex: string;
  serviceConnsDestinationPipeline: string;
  servicesInTrace: string[];
}) {
  return (serviceConnection: ServiceConnection) => {
    const indexAction = {
      index: {
        _index:
          serviceConnsDestinationIndex ||
          (serviceConnection.caller._index as string)
      },
      pipeline: serviceConnsDestinationPipeline || undefined // TODO is this even necessary?
    };

    const source = {
      '@timestamp': serviceConnection.caller.timestamp,
      observer: { version_major: 7 }, // TODO get stack version from NP api
      service: {
        name: serviceConnection.caller.service_name,
        environment: serviceConnection.caller.environment
      },
      callee: serviceConnection.callee
        ? {
            name: serviceConnection.callee.service_name,
            environment: serviceConnection.callee.environment
          }
        : undefined,
      connection: {
        upstream: {
          list: serviceConnection.upstream,
          keyword: serviceConnection.upstream.join('->') // TODO is this even used/necessary?
        },
        in_trace: servicesInTrace,
        type: serviceConnection.caller.span_type,
        subtype: serviceConnection.caller.span_subtype
      },
      destination: serviceConnection.caller.destination
        ? { address: serviceConnection.caller.destination }
        : undefined
    };
    return [indexAction, source];
  };
}
