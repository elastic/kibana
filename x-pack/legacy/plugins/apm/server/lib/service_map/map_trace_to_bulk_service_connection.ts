/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceConnection } from './run_service_map_task';
import { TIMESTAMP } from '../../../common/elasticsearch_fieldnames';
import { ApmIndicesConfig } from '../settings/apm_indices/get_apm_indices';

export function mapTraceToBulkServiceConnection(
  apmIndices: ApmIndicesConfig,
  servicesInTrace: string[]
) {
  return (traceConnection: TraceConnection) => {
    const indexAction = {
      index: {
        _index: apmIndices.apmServiceConnectionsIndex
      }
    };

    const source = {
      [TIMESTAMP]: traceConnection.caller.timestamp,
      service: {
        name: traceConnection.caller.service_name,
        environment: traceConnection.caller.environment
      },
      callee: {
        name: traceConnection.callee?.service_name,
        environment: traceConnection.callee?.environment
      },
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
