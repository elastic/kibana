/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { IEventLogger } from '@kbn/event-log-plugin/server';
import { AlertingEventLogger } from '../alerting_event_logger/alerting_event_logger';

/**
 * Delete all gaps for this ruleId
 */
export const deleteGaps = async (params: {
  ruleIds: string[];
  eventLogger: IEventLogger | undefined;
  logger: Logger;
}) => {
  const { ruleIds, logger, eventLogger } = params;

  try {
    if (!eventLogger) {
      throw new Error('DeleteGaps: EventLogger not initialized');
    }
    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    await alertingEventLogger.deleteGaps(ruleIds);
  } catch (err) {
    logger.error(`Failed to delete gaps for rule ${ruleIds.join(', ')}: ${err.message}`);
    throw err;
  }
};
