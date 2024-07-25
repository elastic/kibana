/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, omit } from 'lodash';
import { generateEvent as generateAdminConsole } from '../fake_stack/admin_console';
import { generateEvent as generateMongoDB } from '../fake_stack/mongodb';
import { generateEvent as generateMessageProcessor } from '../fake_stack/message_processor';
import { generateEvent as generateNginxProxy } from '../fake_stack/nginx_proxy';
import { generateEvent as generateHeartbeat } from '../fake_stack/heartbeat';
import { Doc, GeneratorFunction } from '../../types';
import { ADMIN_CONSOLE } from '../fake_stack/common/constants';

const convertToMongoDBRawLog = (event: any) => {
  return {
    '@timestamp': event['@timestamp'],
    message: `${event['@timestamp']} ${event.log.level === 'ERROR' ? 'E' : 'I'} ${
      event.mongodb.component
    } [${event.mongodb.context}] ${event.message}`,
  } as unknown as Doc & { message: string };
};

const convertToNginxRawLog = (event: any) => {
  return { '@timestamp': event['@timestamp'], message: event.message } as unknown as Doc & {
    message: string;
  };
};

export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const scenario = config.indexing.scenario || 'fake_stack';
  const adminConsoleEvents = generateAdminConsole(config, schedule, index, timestamp);
  const mongodbEvents = generateMongoDB(config, schedule, index, timestamp).map(
    convertToMongoDBRawLog
  );
  const messageProcessorEvents = generateMessageProcessor(config, schedule, index, timestamp);
  const nginxProxyEvents = generateNginxProxy(config, schedule, index, timestamp).map(
    convertToNginxRawLog
  );
  const heartbeatEvents = generateHeartbeat(config, schedule, index, timestamp);
  return [
    ...(isArray(adminConsoleEvents) ? adminConsoleEvents : [adminConsoleEvents]),
    ...(isArray(mongodbEvents) ? mongodbEvents : [mongodbEvents]),
    ...(isArray(messageProcessorEvents) ? messageProcessorEvents : [messageProcessorEvents]),
    ...(isArray(nginxProxyEvents) ? nginxProxyEvents : [nginxProxyEvents]),
    ...(isArray(heartbeatEvents) ? heartbeatEvents : [heartbeatEvents]),
  ].map((event: Doc) => {
    const labels = event.labels ?? {};
    const message = JSON.stringify(
      omit(
        {
          ...event,
          labels: { ...labels, scenario },
        },
        'namespace'
      )
    );
    const finalDoc = {
      namespace: ADMIN_CONSOLE,
      '@timestamp': event['@timestamp'],
      message,
      data_stream: { dataset: ADMIN_CONSOLE, namespace: 'default' },
    };

    return finalDoc;
  });
};
