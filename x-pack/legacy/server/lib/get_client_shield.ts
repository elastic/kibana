/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { Legacy } from 'kibana';
// @ts-ignore
import esShield from './esjs_shield_plugin';

export const getClient = once((server: Legacy.Server) => {
  return server.plugins.elasticsearch.createCluster('security', { plugins: [esShield] });
});
