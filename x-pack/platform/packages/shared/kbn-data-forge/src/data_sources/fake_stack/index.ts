/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import {
  generateEvent as generateAdminConsole,
  kibanaAssets as kibanaAssetsAdminConsole,
} from './admin_console';
import { generateEvent as generateMongoDB, kibanaAssets as kibanaAssetsMongoDB } from './mongodb';
import {
  generateEvent as generateMessageProcessor,
  kibanaAssets as kibanaAssetsMessageProcessor,
} from './message_processor';
import {
  generateEvent as generateNginxProxy,
  kibanaAssets as kibanaAssetsNginxProxy,
} from './nginx_proxy';
import {
  generateEvent as generateHeartbeat,
  kibanaAssets as kibanaAssetsHeartbeat,
} from './heartbeat';

import { GeneratorFunction } from '../../types';

import { indexTemplate as adminConsoleIndexTemplate } from './admin_console/ecs';
import { indexTemplate as messageProcessorIndexTemplate } from './message_processor/ecs';
import { indexTemplate as mongodbIndexTemplate } from './mongodb/ecs';
import { indexTemplate as nginxProxyIndexTemplate } from './nginx_proxy/ecs';
import { indexTemplate as heartbeatIndexTemplate } from './heartbeat/ecs';

export const indexTemplate = [
  adminConsoleIndexTemplate,
  messageProcessorIndexTemplate,
  mongodbIndexTemplate,
  nginxProxyIndexTemplate,
  heartbeatIndexTemplate,
];

export const kibanaAssets = [
  kibanaAssetsAdminConsole,
  kibanaAssetsMongoDB,
  kibanaAssetsMessageProcessor,
  kibanaAssetsNginxProxy,
  kibanaAssetsHeartbeat,
  `${__dirname}/assets/transaction_rates.ndjson`,
];

export const generteEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const scenario = config.indexing.scenario || 'fake_stack';
  const adminConsoleEvents = generateAdminConsole(config, schedule, index, timestamp);
  const mongodbEvents = generateMongoDB(config, schedule, index, timestamp);
  const messageProcessorEvents = generateMessageProcessor(config, schedule, index, timestamp);
  const nginxProxyEvents = generateNginxProxy(config, schedule, index, timestamp);
  const heartbeatEvents = generateHeartbeat(config, schedule, index, timestamp);
  return [
    ...(isArray(adminConsoleEvents) ? adminConsoleEvents : [adminConsoleEvents]),
    ...(isArray(mongodbEvents) ? mongodbEvents : [mongodbEvents]),
    ...(isArray(messageProcessorEvents) ? messageProcessorEvents : [messageProcessorEvents]),
    ...(isArray(nginxProxyEvents) ? nginxProxyEvents : [nginxProxyEvents]),
    ...(isArray(heartbeatEvents) ? heartbeatEvents : [heartbeatEvents]),
  ].map((event) => {
    const labels = event.labels ?? {};
    return { ...event, labels: { ...labels, scenario } };
  });
};
