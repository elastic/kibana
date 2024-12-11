/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { EventFunction } from '../../../../../types';
import { MONGODB_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';

export const createStartupEvents: EventFunction = (_schedule, timestamp) =>
  MONGODB_HOSTS.map((host) =>
    [
      `MongoDB starting : pid=${faker.string.numeric(
        4
      )} port=27017 dbpath=/data/db 64-bit host=${host} db version v5.0.0`,
      'git version: abcdef1234567890123456789012345678901234',
      'OpenSSL version: OpenSSL 1.1.1g  21 Apr 2020',
      'allocator: tcmalloc',
      'modules: none',
      'build environment:\n distarch: x86_64\n target_arch: x86_64',
      'options: { net: { bindIp: "0.0.0.0", port: 27017 }, storage: { dbPath: "/data/db" } }',
      "Detected data files in /data/db created by the 'wiredTiger' storage engine, so setting the active storage engine to 'wiredTiger'.",
      'wiredtiger_open config: create,cache_size=5G,session_max=20000,eviction=(threads_min=4,threads_max=4),config_base=false,statistics=(fast),compatibility=(release="5.0",require_max="5.0"),log=(enabled=true,archive=true,path=journal,compressor=snappy),file_manager=(close_idle_time=100000),checkpoint=(wait=60,log_size=2GB),statistics_log=(wait=0),verbose=[recovery_progress,checkpoint_progress,compact_progress],',
      'WiredTiger message [1659274801:140079][1234:0x7f00d319c700], txn-recover: Set global recovery timestamp: (0, 0)',
      ' WiredTiger recoveryTimestamp. Ts: Timestamp(0, 0)',
      'Timestamp monitor starting',
      '** WARNING: Access control',
    ].map((message) =>
      createBaseEvent(timestamp, host, 'initandlisten', 'CONTROL', message, 'INFO')
    )
  ).flat();
