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

@injectable()
export class StoreAlertsStep implements RuleExecutionStep {
  public readonly name = 'store_alerts';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { alertEvents, input } = state;

    if (!alertEvents) {
      throw new Error('StoreAlertsStep requires alertEvents from previous step');
    }

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
