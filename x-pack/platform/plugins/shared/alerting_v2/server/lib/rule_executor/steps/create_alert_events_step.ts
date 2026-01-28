/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { buildAlertEventsFromEsqlResponse } from '../build_alert_events';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/alert_events';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { StateWithEsqlResponse, StateWithRule } from '../type_guards';
import { hasRuleAndEsqlResponse } from '../type_guards';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  private isStepReady(
    state: Readonly<RulePipelineState>
  ): state is StateWithRule & StateWithEsqlResponse {
    return hasRuleAndEsqlResponse(state);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input } = state;

    if (!this.isStepReady(state)) {
      return { type: 'halt', reason: 'state_not_ready' };
    }

    const { rule, esqlResponse } = state;

    const alertEvents = buildAlertEventsFromEsqlResponse({
      ruleId: input.ruleId,
      spaceId: input.spaceId,
      ruleAttributes: rule,
      esqlResponse,
      scheduledTimestamp: input.scheduledAt,
      ruleVersion: 1,
    });

    const targetDataStream = ALERT_EVENTS_DATA_STREAM;

    await this.storageService.bulkIndexDocs({
      index: targetDataStream,
      docs: alertEvents.map(({ doc }) => doc),
      getId: (_doc, i) => alertEvents[i].id,
    });

    this.logger.debug({
      message: `alerting_v2:esql run: ruleId=${input.ruleId} spaceId=${input.spaceId} alertsDataStream=${targetDataStream}`,
    });

    return { type: 'continue' };
  }
}
