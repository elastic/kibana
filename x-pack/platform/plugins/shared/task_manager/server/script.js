/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const args = {};

process.on('message', (msg) => {
  if (msg.action === 'setArg') {
    args[msg.key] = msg.value;
  } else if (msg.action === 'run') {
    run();
    process.exit(0);
  }
});

function run() {
  console.log('Hello world', args);
}
