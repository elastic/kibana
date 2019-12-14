/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TraceConnection } from './run_service_map_task';
import {
  TIMESTAMP,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  DESTINATION_ADDRESS
} from '../../../common/elasticsearch_fieldnames';
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
      [TIMESTAMP]: traceConnection.caller[TIMESTAMP],
      service: {
        name: traceConnection.caller[SERVICE_NAME],
        environment: traceConnection.caller[SERVICE_ENVIRONMENT]
      },
      callee: {
        name: traceConnection.callee?.[SERVICE_NAME],
        environment: traceConnection.callee?.[SERVICE_ENVIRONMENT]
      },
      connection: {
        upstream: {
          list: traceConnection.upstream
        },
        in_trace: servicesInTrace,
        type: traceConnection.caller[SPAN_TYPE],
        subtype: traceConnection.caller[SPAN_SUBTYPE]
      },
      destination: { address: traceConnection.caller[DESTINATION_ADDRESS] }
    };
    return [indexAction, source];
  };
}
