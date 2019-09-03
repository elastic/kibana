/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSourceConfiguration } from '../../../lib/sources';

export const getIdFieldName = (sourceConfiguration: InfraSourceConfiguration, nodeType: string) => {
  switch (nodeType) {
    case 'host':
      return sourceConfiguration.fields.host;
    case 'container':
      return sourceConfiguration.fields.container;
    default:
      return sourceConfiguration.fields.pod;
  }
};
