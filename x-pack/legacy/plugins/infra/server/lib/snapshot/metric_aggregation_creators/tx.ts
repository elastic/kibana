/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../../../graphql/types';
import { networkTraffic } from './network_traffic';

const METRIC_FIELDS = {
  [InfraNodeType.host]: 'system.network.out.bytes',
  [InfraNodeType.pod]: 'kubernetes.pod.network.tx.bytes',
  [InfraNodeType.container]: 'docker.network.out.bytes',
};

const INTERFACE_FIELDS = {
  [InfraNodeType.host]: 'system.network.name',
  [InfraNodeType.pod]: null,
  [InfraNodeType.container]: 'docker.network.interface',
};

export const tx = networkTraffic('tx', METRIC_FIELDS, INTERFACE_FIELDS);
