/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';
import { createToken } from '@kbn/core-di';
import { injectable } from 'inversify';
import type { GuardedQueryType } from '../../errors/query_response_size_exceeded_error';

export type RuleKindAttribute = 'alert' | 'signal' | 'unknown';

export const QUERY_RESPONSE_SIZE_EXCEEDED_METRIC =
  'kibana.alerting_v2.rule_execution.query_response_size_exceeded.count';

export interface RuleExecutionTelemetryContract {
  recordQueryResponseSizeExceeded(args: {
    queryType: GuardedQueryType;
    ruleKind: RuleKindAttribute;
  }): void;
}

export const RuleExecutionTelemetryToken = createToken<RuleExecutionTelemetryContract>(
  'alerting_v2.RuleExecutionTelemetry'
);

/**
 * OTel metrics for the rule executor. Bound as a singleton so the meter and its
 * instruments are created once per process and shared by every execution.
 */
@injectable()
export class RuleExecutionTelemetry implements RuleExecutionTelemetryContract {
  private readonly meter = metrics.getMeter('kibana.alerting_v2');
  private readonly queryResponseSizeExceededCounter: Counter<Attributes>;

  constructor() {
    this.queryResponseSizeExceededCounter = this.meter.createCounter(
      QUERY_RESPONSE_SIZE_EXCEEDED_METRIC,
      {
        description:
          'Number of rule executions that failed because an ES|QL response exceeded xpack.alerting_v2.rules.run.query.maxResponseSize, partitioned by which query tripped the guardrail (alerting.query.type) and the rule kind (alerting.rule.kind).',
        unit: '1',
        valueType: ValueType.INT,
      }
    );
  }

  public recordQueryResponseSizeExceeded({
    queryType,
    ruleKind,
  }: {
    queryType: GuardedQueryType;
    ruleKind: RuleKindAttribute;
  }): void {
    this.queryResponseSizeExceededCounter.add(1, {
      'alerting.query.type': queryType,
      'alerting.rule.kind': ruleKind,
    });
  }
}
