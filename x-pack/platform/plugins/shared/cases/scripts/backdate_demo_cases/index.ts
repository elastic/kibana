/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger } from '../cases_generator/logger';
import { runBackdate } from './run';

async function main() {
  try {
    await runBackdate();
  } catch (error) {
    logger.error(error);
  }
}

main();
