/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  createAlertEventsBatchBuilder,
  resolveAlertEventType,
  type AlertEventsBatchBuilder,
} from '../build_alert_events';
import { alertEventType } from '../../../resources/datastreams/alert_events';
import type { AlertEventType } from '../../../resources/datastreams/alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { createReasonRenderer, type ReasonRenderer } from '../reason_template';
import { forwardThenFinalize, guardedExpandStep } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { ConfigService } from '../../services/config_service/config_service';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  private readonly maxGroupsPerExecution: number;

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(ConfigService) configService: ConfigService
  ) {
    this.maxGroupsPerExecution = configService.get('rules.run.maxGroupsPerExecution');
  }

  /**
   * Only alert rules carry a reason. The renderer parses the template once and is reused for every
   * row of every batch of the run. A template that cannot be rendered is logged once, at debug level, since it can repeat on every run.
   */
  private buildReasonRenderer({
    rule,
    eventType,
    ruleId,
    spaceId,
  }: {
    rule: RuleResponse;
    eventType: AlertEventType;
    ruleId: string;
    spaceId: string;
  }): ReasonRenderer {
    return createReasonRenderer({
      template: eventType === alertEventType.alert ? rule.reason?.template : undefined,
      rule,
      onError: () =>
        this.logger.debug({
          message: 'Reason template could not be rendered; events are written without a reason',
          labels: { rule_id: ruleId, space_id: spaceId, step: this.name },
        }),
    });
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;
    let builder: AlertEventsBatchBuilder | undefined;

    const built = guardedExpandStep(streamState, ['rule', 'esqlRowBatch'], async function* (state) {
      const eventType = resolveAlertEventType(state.rule);
      const logger = state.logger.withLabels({ step: step.name });

      if (!builder) {
        builder = createAlertEventsBatchBuilder({
          ruleId: state.input.ruleId,
          spaceId: state.input.spaceId,
          ruleAttributes: state.rule,
          scheduledTimestamp: state.input.scheduledAt,
          ruleVersion: state.rule.version,
          type: eventType,
          maxGroupsPerExecution: step.maxGroupsPerExecution,
          reasonRenderer: step.buildReasonRenderer({
            rule: state.rule,
            eventType,
            ruleId: state.input.ruleId,
            spaceId: state.input.spaceId,
          }),
          activeGroupHashes: new Set(
            (state.activeGroups ?? []).map(({ group_hash: groupHash }) => groupHash)
          ),
        });

        logger.debug({ message: 'Created alert events builder' });
      }

      const droppedGroupsBefore = builder.droppedGroupCount;
      const alertEventsBatch = builder.buildBatch([...state.esqlRowBatch]);
      // Count distinct groups newly dropped by the max this batch
      const groupsDroppedInBatch = builder.droppedGroupCount - droppedGroupsBefore;

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch },
        meta: {
          counters: {
            [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: groupsDroppedInBatch,
          },
        },
      };
    });

    return forwardThenFinalize(built, {
      // The builder keeps track of the dropped group count, so there is nothing to accumulate
      seed: undefined,
      accumulate: (acc) => acc,
      finalize: (_acc, lastState) => {
        const droppedGroupCount = builder?.droppedGroupCount ?? 0;
        if (droppedGroupCount > 0) {
          step.logger.warn({
            message: `[${step.name}] Rule ${lastState.input.ruleId} (space ${lastState.input.spaceId}) exceeded maxGroupsPerExecution=${step.maxGroupsPerExecution}; dropped ${droppedGroupCount} new group(s) this run`,
            code: ALERTING_LOG_CODES.RULE_EXECUTION_MAX_GROUPS_EXCEEDED,
            labels: {
              rule_id: lastState.input.ruleId,
              space_id: lastState.input.spaceId,
              step: step.name,
            },
          });
        }
        return undefined;
      },
    });
  }
}
