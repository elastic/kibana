/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../graphql/types';
import { InfraNodeType } from '../http_api/common';

export const getApmFieldName = (
  sourceConfiguration: InfraSourceConfiguration,
  nodeType: InfraNodeType
) => {
  return nodeType === 'host' ? 'host.hostname' : getIdFieldName(sourceConfiguration, nodeType);
};

export const getIdFieldName = (
  sourceConfiguration: InfraSourceConfiguration,
  nodeType: InfraNodeType
) => {
  switch (nodeType) {
    case 'host':
      return sourceConfiguration.fields.host;
    case 'container':
      return sourceConfiguration.fields.container;
    default:
      return sourceConfiguration.fields.pod;
  }
};
