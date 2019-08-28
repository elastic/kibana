/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { InfraNodeType } from '../../../graphql/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../lib/lib';

const BASE_URL = '../app/uptime#/?search=';

export const createUptimeLink = (
  options: InfraWaffleMapOptions,
  nodeType: InfraNodeType,
  node: InfraWaffleMapNode
) => {
  if (nodeType === InfraNodeType.host && node.ip) {
    return `${BASE_URL}host.ip:"${node.ip}"`;
  }
  const field = get(options, ['fields', nodeType], '');
  return `${BASE_URL}${field ? field + ':' : ''}"${node.id}"`;
};
