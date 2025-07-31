/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleProcessingSuggestion } from './suggestions_handler';
import { simulateProcessing } from './simulation_handler';
import { InferenceClient } from '@kbn/inference-common';
import { ScopedClusterClient } from '@kbn/core-elasticsearch-client-server-internal';
import { StreamsClient } from '../../../../lib/streams/client';
import { ProcessingSuggestionBody } from './route';

jest.mock('./simulation_handler', () => ({
  simulateProcessing: jest.fn((params) =>
    Promise.resolve({
      documents: [],
      documents_metrics: {
        parsed_rate: 1,
      },
      simulationField: 'dummy',
      // include any simulation-specific response details if necessary
    })
  ),
}));

const samples = [
  {
    '@timestamp': '2025-04-22T09:28:31.329Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:31 2025] [error] [client 211.62.201.48] Directory index forbidden by rule: /var/www/html/',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:29.165Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:29 2025] [error] [client 218.62.18.218] Directory index forbidden by rule: /var/www/html/',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2085 in scoreboard",
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2086 in scoreboard",
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2087 in scoreboard",
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2084 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.768Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2081 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message: "[Tue Apr 22 09:28:07 2025] [error] jk2_init() Can't find child 2082 in scoreboard",
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2083 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child init 1 -2',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.767Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.536Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2061 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.535Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2059 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.535Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2060 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.387Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2051 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.310Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2045 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.262Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2042 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.015Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.015Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.015Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:07 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.015Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.015Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.015Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [error] mod_jk child workerEnv in error state 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.011Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2032 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.010Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2030 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:07.010Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:07 2025] [notice] jk2_init() Found child 2031 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.980Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.980Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.976Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.976Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.953Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2028 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.953Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2027 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.953Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2029 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.698Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.698Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.698Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.698Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.698Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.698Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.692Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2008 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.691Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2007 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.691Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2006 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.682Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.681Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.645Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2005 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.645Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2004 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.628Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2002 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.628Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2001 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.573Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 10',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.573Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.573Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 10',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.566Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.566Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.566Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.548Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1999 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.548Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 2000 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.548Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1998 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.462Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1990 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.412Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1984 in scoreboard slot 10',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.294Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1970 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.218Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1966 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.218Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1967 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.218Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1965 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.200Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1964 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.164Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1962 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.164Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1963 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.140Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1961 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.078Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1959 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.078Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1958 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.072Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.071Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:06 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:06.011Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:06 2025] [notice] jk2_init() Found child 1957 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.899Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.894Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1950 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.894Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1951 in scoreboard slot 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.894Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1949 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.894Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1948 in scoreboard slot 8',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.765Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1938 in scoreboard slot 9',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.744Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [notice] jk2_init() Found child 1937 in scoreboard slot 6',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.737Z',
    filepath: 'Apache.log',
    message: '[Tue Apr 22 09:28:05 2025] [error] mod_jk child workerEnv in error state 7',
    'stream.name': 'logs.apache',
  },
  {
    '@timestamp': '2025-04-22T09:28:05.733Z',
    filepath: 'Apache.log',
    message:
      '[Tue Apr 22 09:28:05 2025] [notice] workerEnv.init() ok /etc/httpd/conf/workers2.properties',
    'stream.name': 'logs.apache',
  },
];

describe('handleProcessingSuggestion', () => {
  const dummyChatResponse = {
    output: {
      description: 'Your pipeline name here',
      processors: [
        {
          grok: {
            field: 'message',
            patterns: ['Your Grok pattern here'],
            pattern_definitions: {
              CUSTOM_TIMESTAMP: '...',
            },
          },
        },
      ],
    },
  };

  let inferenceClientMock: jest.Mocked<InferenceClient>;

  const scopedClusterClientMock = {} as unknown as ScopedClusterClient;
  const streamsClientMock = {
    getStream: jest.fn().mockResolvedValue({ name: 'test' }),
  } as unknown as StreamsClient;

  const body: ProcessingSuggestionBody = {
    connectorId: 'connector1',
    field: 'message',
    samples,
  };

  beforeEach(() => {
    (simulateProcessing as jest.Mock).mockClear();
    inferenceClientMock = {
      output: jest.fn().mockResolvedValue(dummyChatResponse),
    } as unknown as jest.Mocked<InferenceClient>;
  });

  it('processes samples correctly and returns expected simulation results', async () => {
    const result = await handleProcessingSuggestion(
      'test',
      body,
      inferenceClientMock,
      scopedClusterClientMock,
      streamsClientMock
    );

    expect(inferenceClientMock.output).toHaveBeenCalledTimes(1);
    expect(inferenceClientMock.output).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: 'connector1',
      })
    );
    expect(result).toEqual([
      {
        description: 'Your pipeline name here',
        grokProcessor: {
          field: 'message',
          pattern_definitions: {
            CUSTOM_TIMESTAMP: '...',
          },
          patterns: ['Your Grok pattern here'],
        },
        simulationResult: {
          documents: [],
          documents_metrics: {
            parsed_rate: 1,
          },
          simulationField: 'dummy',
        },
      },
    ]);
  });
});
