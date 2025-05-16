/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import ipaddr from 'ipaddr.js';
import { sum } from 'lodash';

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ReportingConfigType } from '@kbn/reporting-server';

/*
 * Set up dynamic config defaults
 * - xpack.kibanaServer
 * - xpack.reporting.encryptionKey
 */
export function createConfig(
  core: CoreSetup,
  config: ReportingConfigType,
  parentLogger: Logger
): ReportingConfigType {
  const logger = parentLogger.get('config');

  // encryption key
  let encryptionKey = config.encryptionKey;
  if (encryptionKey === undefined) {
    logger.warn(
      'Generating a random key for xpack.reporting.encryptionKey. To prevent sessions from being invalidated on ' +
        'restart, please set xpack.reporting.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
    );
    encryptionKey = crypto.randomBytes(16).toString('hex');
  }

  const hashedEncryptionKey = crypto.createHash('sha3-256').update(encryptionKey).digest('base64');
  logger.info(`Hashed 'xpack.reporting.encryptionKey' for this instance: ${hashedEncryptionKey}`);

  const { kibanaServer: reportingServer } = config;
  const serverInfo = core.http.getServerInfo();
  // set kibanaServer.hostname, default to server.host, don't allow "0.0.0.0" as it breaks in Windows
  let kibanaServerHostname = reportingServer.hostname
    ? reportingServer.hostname
    : serverInfo.hostname;

  if (
    ipaddr.isValid(kibanaServerHostname) &&
    !sum(ipaddr.parse(kibanaServerHostname).toByteArray())
  ) {
    // A silent override to use "localhost" instead of "0.0.0.0" for connection of the headless browser
    kibanaServerHostname = 'localhost';
  }
  // kibanaServer.port, default to server.port
  const kibanaServerPort = reportingServer.port ? reportingServer.port : serverInfo.port;
  // kibanaServer.protocol, default to server.protocol
  const kibanaServerProtocol = reportingServer.protocol
    ? reportingServer.protocol
    : serverInfo.protocol;

  return {
    ...config,
    encryptionKey,
    kibanaServer: {
      hostname: kibanaServerHostname,
      port: kibanaServerPort,
      protocol: kibanaServerProtocol,
    },
  };
}
