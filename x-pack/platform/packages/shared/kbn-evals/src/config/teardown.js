/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function globalTeardown() {
  if (!process.env.EVAL_START_TIME) {
    // eslint-disable-next-line no-console
    console.warn('EVAL_START_TIME was not set in globalSetup, cannot calculate elapsed time');
    return;
  }

  const startTime = parseInt(process.env.EVAL_START_TIME, 10);
  const elapsed = Date.now() - startTime;
  const seconds = (elapsed / 1000).toFixed(2);

  console.log(`Evaluation run duration: ${seconds}s\n`);
}
