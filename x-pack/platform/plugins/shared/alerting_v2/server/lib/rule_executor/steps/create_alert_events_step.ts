/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  createAlertEventsBatchBuilder,
  resolveAlertEventType,
  type AlertEventsBatchBuilder,
} from '../build_alert_events';
import { forwardThenFinalize, guardedExpandStep } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { ConfigService } from '../../services/config_service/config_service';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  private readonly maxGroupsPerExecution: number;

  constructor(@inject(ConfigService) configService: ConfigService) {
    this.maxGroupsPerExecution = configService.get('rules.run.maxGroupsPerExecution');
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
          lastState.logger.withLabels({ step: step.name }).warn({
            message: () =>
              `Dropped ${droppedGroupCount} new groups beyond maxGroupsPerExecution (${step.maxGroupsPerExecution})`,
            code: ALERTING_LOG_CODES.RULE_EXECUTION_MAX_GROUPS_EXCEEDED,
          });
        }
        return undefined;
      },
    });
  }
}
