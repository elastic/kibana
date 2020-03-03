/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import { spawn } from 'child_process';
import { startTaskManager, Job } from '../lib';

const jobs: Job[] = [
  {
    label: 'Simple promise',
    setup: () => {
      return spawn('ping', ['www.google.com', '-c', '10', '-i', '0.2', '-v']);
    },
    start: () => {
      return Promise.resolve('hey!');
    }
  },
  // {
  //   label: 'Ping dr.dk',
  //   setup: () => {
  //     throw new Error('start docker!');
  //   },
  //   start: () => {
  //     // return spawn('ping with invalid commands');
  //     return spawn('ping', ['www.dr.dk', '-c', '3']);
  //   }
  // },
  {
    label: 'Fetch Hacker News',
    stop: () => {
      return spawn('ls');
    },
    start: () => {
      return spawn('curl', [
        'https://news.ycombinator.com',
        '-s',
        '--limit-rate',
        '5K'
      ]);
    }
  },
  {
    label: 'Ping Google.com',
    start: () => {
      const child = spawn('ping', ['www.google.com', '-c', '3']);
      setTimeout(() => {
        // @ts-ignore
        child.kill(1);
      }, 1000);
      return child;
    }
  },
  {
    label: 'Ping Google.com',
    start: () => {
      return spawn('ping', ['www.google.assadascom']);
    }
  }
];

startTaskManager(jobs);
