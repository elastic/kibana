/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { networkTraffic } from './network_traffic';
export const tx = networkTraffic('tx', 'system.network.out.bytes', 'system.network.name');
