/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOGGING_TAG,
  KIBANA_MONITORING_LOGGING_TAG,
  KIBANA_STATS_TYPE_MONITORING,
} from '../../../common/constants';
import { opsBuffer } from './ops_buffer';
import Oppsy from 'oppsy';
import { cloneDeep } from 'lodash';

let bufferHadEvents = false;

class OpsMonitor {
  constructor(hapiServer, buffer, interval) {
    this._buffer = buffer;
    this._interval = interval;
    this._oppsy = new Oppsy(hapiServer);
    this._server = hapiServer;
  }

  start = () => {
    this._oppsy.on('ops', (event) => {
      // Oppsy has a bad race condition that will modify this data before
      // we ship it off to the buffer. Let's create our copy first.
      event = cloneDeep(event);
      // Oppsy used to provide this, but doesn't anymore. Grab it ourselves.
      this._server.listener.getConnections((_, count) => {
        event.concurrent_connections = count;
        this._buffer.push(event);
      });
    });

    this._oppsy.on('error', console.log);
    this._oppsy.start(this._interval);
  };

  stop = () => {
    this._oppsy.stop();
    this._oppsy.removeAllListeners();
  };
}


/*
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(usageCollection, {
  elasticsearchPlugin,
  kbnServerConfig,
  log,
  config,
  getOSInfo,
  hapiServer,
}) {
  const buffer = opsBuffer({ log, config, getOSInfo });
  const interval = kbnServerConfig.get('ops.interval');
  const opsMonitor = new OpsMonitor(hapiServer, buffer, interval);

  /* Handle stopping / restarting the event listener if Elasticsearch stops and restarts
   * NOTE it is possible for the plugin status to go from red to red and
   * trigger handlers twice
   */
  elasticsearchPlugin.status.on('red', opsMonitor.stop);
  elasticsearchPlugin.status.on('green', opsMonitor.start);

  // `process` is a NodeJS global, and is always available without using require/import
  process.on('SIGHUP', () => {
    log(
      ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
      'Re-initializing Kibana Monitoring due to SIGHUP'
    );
    setTimeout(() => {
      opsMonitor.stop();
      opsMonitor.start();
      log(
        ['info', LOGGING_TAG, KIBANA_MONITORING_LOGGING_TAG],
        'Re-initializing Kibana Monitoring due to SIGHUP'
      );
    }, 5 * 1000); // wait 5 seconds to avoid race condition with reloading logging configuration
  });

  return usageCollection.makeStatsCollector({
    type: KIBANA_STATS_TYPE_MONITORING,
    init: opsMonitor.start,
    isReady: () => {
      if (!bufferHadEvents) {
        bufferHadEvents = buffer.hasEvents();
      }
      return bufferHadEvents;
    },
    fetch: async () => {
      return await buffer.flush();
    }
  });
}
