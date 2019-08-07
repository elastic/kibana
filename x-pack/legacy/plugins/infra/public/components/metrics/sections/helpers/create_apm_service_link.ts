/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { InfraNodeType, InfraTimerangeInput } from '../../../../graphql/types';
import { SourceConfiguration } from '../../../../utils/source_configuration';
import { getApmFieldName } from '../../../../../common/utils/get_apm_field_name';

export const createAPMServiceLink = (
  serviceName: string,
  nodeId: string,
  nodeType: InfraNodeType,
  sourceConfiguration: SourceConfiguration,
  timeRange: InfraTimerangeInput
) => {
  const nodeField = getApmFieldName(sourceConfiguration, nodeType);
  const from = moment(timeRange.from).toISOString();
  const to = moment(timeRange.to).toISOString();
  return `../app/apm#/services/${serviceName}/transactions?rangeFrom=${from}&rangeTo=${to}&transactionType=request&kuery=${encodeURIComponent(
    `${nodeField}:"${nodeId}"`
  )}`;
};
