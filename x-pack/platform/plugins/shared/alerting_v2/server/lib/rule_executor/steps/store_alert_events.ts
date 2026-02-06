/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/alert_events';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { hasState, type StateWith } from '../type_guards';

@injectable()
export class StoreAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'store_alert_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  private isStepReady(state: Readonly<RulePipelineState>): state is StateWith<'alertEvents'> {
    return hasState(state, ['alertEvents']);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input } = state;

    this.logger.debug({
      message: `[${this.name}] Starting step for rule ${input.ruleId}`,
    });

    if (!this.isStepReady(state)) {
      this.logger.debug({ message: `[${this.name}] State not ready, halting` });
      return { type: 'halt', reason: 'state_not_ready' };
    }

    const { alertEvents } = state;

    this.logger.debug({
      message: `[${this.name}] Storing ${alertEvents.length} alert events to ${ALERT_EVENTS_DATA_STREAM}`,
    });

    await this.storageService.bulkIndexDocs({
      index: ALERT_EVENTS_DATA_STREAM,
      docs: alertEvents,
    });

    this.logger.debug({
      message: `[${this.name}] Successfully stored ${alertEvents.length} alert events`,
    });

    return { type: 'continue' };
  }
}
