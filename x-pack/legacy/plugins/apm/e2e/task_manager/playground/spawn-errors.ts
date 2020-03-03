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

setInterval(() => {}, 1000);

async function init() {
  try {
    const child = spawn('node asa a');

    // stderr
    child.stderr.on('data', (d: Buffer) => {
      console.log('stderr:data', d.toString());
    });

    child.stderr.on('close', () => {
      console.log('stderr:close');
    });

    child.stderr.on('end', () => {
      console.log('stderr:end');
    });

    child.stderr.on('error', e => {
      console.log('stderr:error', e);
    });

    // stdout
    child.stdout.on('data', (d: Buffer) => {
      console.log('stdout:data', d.toString());
    });

    child.stdout.on('close', () => {
      console.log('stdout:close');
    });

    child.stdout.on('end', () => {
      console.log('stdout:end');
    });

    child.stdout.on('error', e => {
      console.log('stdout:error', e);
    });

    // child
    child.on('exit', code => {
      console.log('child:exit', code);
    });

    child.on('close', () => {
      console.log('child:close');
    });

    child.on('error', e => {
      console.log('child:error', e);
    });

    child.on('message', m => {
      console.log('child:message', m);
    });

    child.on('disconnect', () => {
      console.log('disconnect');
    });
  } catch (e) {
    console.log('as');
  }
}

init();
