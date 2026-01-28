/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { buildAlertEventsFromEsqlResponse } from '../build_alert_events';

@injectable()
export class BuildAlertsStep implements RuleExecutionStep {
  public readonly name = 'build_alerts';

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { rule, esqlResponse, input } = state;

    if (!rule) {
      throw new Error('BuildAlertsStep requires rule from previous step');
    }

    if (!esqlResponse) {
      throw new Error('BuildAlertsStep requires esqlResponse from previous step');
    }

    const alertEvents = buildAlertEventsFromEsqlResponse({
      ruleId: input.ruleId,
      spaceId: input.spaceId,
      ruleAttributes: rule,
      esqlResponse,
      scheduledTimestamp: input.scheduledAt,
      ruleVersion: 1,
    });

    return { type: 'continue', data: { alertEvents } };
  }
}
