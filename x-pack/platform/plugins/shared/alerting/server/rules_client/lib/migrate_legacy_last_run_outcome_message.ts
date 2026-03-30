/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrates legacy lastRun.outcomeMsg from string to string[]
 *
 * Rule SO schema forces lastRun.outcomeMsg to be string[].
 * However, some rules may have lastRun.outcomeMsg as string after upgrading from 7.x due to
 * lack of migration. lastRun.outcomeMsg schema change from string to string[] happened after
 * classical migrations were deprecated due to Serverless. And quite often it's not an issue
 * as lastRun is absent.
 */
export function migrateLegacyLastRunOutcomeMsg<LastRun extends { outcomeMsg?: unknown }>(
  lastRun: LastRun
): LastRun {
  if (typeof lastRun.outcomeMsg === 'string') {
    return {
      ...lastRun,
      outcomeMsg: [lastRun.outcomeMsg],
    };
  }

  return lastRun;
}
