/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { GetRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';
import { EventLogServiceToken } from '../services/event_log_service/tokens';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import type { ExecutionHistoryClientContract, GetRuleExecutionsArgs } from './types';

@injectable()
export class ExecutionHistoryClient implements ExecutionHistoryClientContract {
  constructor(
    @inject(EventLogServiceToken) private readonly eventLog: EventLogServiceContract,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {}

  public async getRuleExecutions(args: GetRuleExecutionsArgs): Promise<GetRuleExecutionsResponse> {
    return this.eventLog.findRuleExecutions({ spaceId: this.spaceId, ...args });
  }
}
