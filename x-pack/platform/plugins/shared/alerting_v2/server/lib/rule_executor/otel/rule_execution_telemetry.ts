/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Attributes, type Counter, metrics, ValueType } from '@opentelemetry/api';

/** Which of the rule executor's ES|QL queries tripped the guardrail. */
export type GuardedQueryType = 'breach' | 'recovery' | 'data_presence';

export type RuleKindAttribute = 'alert' | 'signal';

export const QUERY_RESPONSE_SIZE_EXCEEDED_METRIC =
  'kibana.alerting_v2.rule_execution.query_response_size_exceeded.count';

/**
 * OTel metrics for the rule executor. One meter per plugin, instruments created once at
 * module load and shared for the process lifetime (same shape as Task Manager's telemetry).
 */
class RuleExecutionTelemetry {
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

  recordQueryResponseSizeExceeded = ({
    queryType,
    ruleKind,
  }: {
    queryType: GuardedQueryType;
    ruleKind: RuleKindAttribute;
  }) => {
    this.queryResponseSizeExceededCounter.add(1, {
      'alerting.query.type': queryType,
      'alerting.rule.kind': ruleKind,
    });
  };
}

export const ruleExecutionTelemetry = new RuleExecutionTelemetry();
