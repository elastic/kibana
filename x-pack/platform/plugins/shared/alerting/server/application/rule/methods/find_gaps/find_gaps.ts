/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { RulesClientContext } from '../../../../rules_client';

import { findGaps as _findGaps } from '../../../../lib/rule_gaps/find_gaps';
import { FindGapsParams } from '../../../../lib/rule_gaps/types';

export async function findGaps(context: RulesClientContext, params: FindGapsParams) {
  try {
    const eventLogClient = await context.getEventLogClient();
    const gaps = await _findGaps({
      params,
      eventLogClient,
      logger: context.logger,
    });

    return gaps;
  } catch (err) {
    const errorMessage = `Failed to find gaps`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
