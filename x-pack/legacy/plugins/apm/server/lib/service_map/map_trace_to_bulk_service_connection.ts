/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceConnection } from './run_service_map_task';
import { TIMESTAMP } from '../../../common/elasticsearch_fieldnames';

export function mapTraceToBulkServiceConnection({
  serviceConnsDestinationIndex,
  serviceConnsDestinationPipeline,
  servicesInTrace
}: {
  serviceConnsDestinationIndex: string;
  serviceConnsDestinationPipeline: string;
  servicesInTrace: string[];
}) {
  return (traceConnection: TraceConnection) => {
    const indexAction = {
      index: {
        _index:
          serviceConnsDestinationIndex ||
          (traceConnection.caller._index as string)
      },
      pipeline: serviceConnsDestinationPipeline || undefined // TODO is this even necessary?
    };

    const source = {
      [TIMESTAMP]: traceConnection.caller.timestamp,
      observer: { version_major: 7 }, // TODO get stack version from NP api
      service: {
        name: traceConnection.caller.service_name,
        environment: traceConnection.caller.environment
      },
      callee: traceConnection.callee
        ? {
            name: traceConnection.callee.service_name,
            environment: traceConnection.callee.environment
          }
        : undefined,
      connection: {
        upstream: {
          list: traceConnection.upstream
        },
        in_trace: servicesInTrace,
        type: traceConnection.caller.span_type,
        subtype: traceConnection.caller.span_subtype
      },
      destination: { address: traceConnection.caller.destination }
    };
    return [indexAction, source];
  };
}
