/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { networkTraffic } from '../../../shared/metrics/snapshot/network_traffic';
export const tx = networkTraffic('tx', 'kubernetes.pod.network.tx.bytes');
