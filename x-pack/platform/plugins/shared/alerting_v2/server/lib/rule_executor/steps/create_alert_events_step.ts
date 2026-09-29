/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  createAlertEventsBatchBuilder,
  resolveAlertEventType,
  type AlertEventsBatchBuilder,
} from '../build_alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { forwardThenFinalize, guardedExpandStep } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PluginConfig } from '../../../config';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  private readonly maxGroupsPerExecution: number;

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.maxGroupsPerExecution =
      pluginConfigAccessor.get<PluginConfig>().rules.run.maxGroupsPerExecution;
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
          ruleVersion: state.rule.metadata.version,
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
