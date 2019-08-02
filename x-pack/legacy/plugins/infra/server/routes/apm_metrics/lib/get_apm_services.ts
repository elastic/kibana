/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import Boom from 'boom';
import { Legacy } from 'kibana';
import { throwErrors } from '../../../../common/runtime_types';
import { APMServiceResponseRT } from '../../../../common/http_api';
import { InfraNodeType } from '../../../../common/http_api/common';
import { getIdFieldName } from '../../metadata/lib/get_id_field_name';
import {
  InfraBackendFrameworkAdapter,
  InfraFrameworkRequest,
} from '../../../lib/adapters/framework';
import { InfraSourceConfiguration } from '../../../lib/sources';

export const getApmServices = async (
  framework: InfraBackendFrameworkAdapter,
  req: InfraFrameworkRequest,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: InfraNodeType,
  timeRange: { min: number; max: number }
) => {
  const nodeField = getIdFieldName(sourceConfiguration, nodeType);
  const params = new URLSearchParams({
    start: moment(timeRange.min).toISOString(),
    end: moment(timeRange.max).toISOString(),
    uiFilters: JSON.stringify({ kuery: `${nodeField}: "${nodeId}"` }),
  });
  const res = await framework.makeInternalRequest(
    req as InfraFrameworkRequest<Legacy.Request>,
    `/api/apm/services?${params.toString()}`,
    'GET'
  );
  if (res.statusCode !== 200) {
    throw res;
  }
  const result = APMServiceResponseRT.decode(res.result).getOrElseL(
    throwErrors(message => Boom.badImplementation(`Request to APM Failed: ${message}`))
  );
  return result.items.map(item => item.serviceName);
};
