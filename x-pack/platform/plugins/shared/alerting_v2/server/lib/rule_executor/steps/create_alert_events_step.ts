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
    let buildBatch: AlertEventsBatchBuilder | undefined;

    const built = guardedExpandStep(streamState, ['rule', 'esqlRowBatch'], async function* (state) {
      const eventType = resolveAlertEventType(state.rule);

      if (!buildBatch) {
        buildBatch = createAlertEventsBatchBuilder({
          ruleId: state.input.ruleId,
          spaceId: state.input.spaceId,
          ruleAttributes: state.rule,
          scheduledTimestamp: state.input.scheduledAt,
          ruleVersion: state.rule.metadata.version,
          type: eventType,
          maxGroupsPerExecution: step.maxGroupsPerExecution,
        });

        step.logger.debug({
          message: `[${step.name}] Created alert events builder for rule ${state.input.ruleId}`,
        });
      }

      const alertEventsBatch = buildBatch([...state.esqlRowBatch]);
      const droppedInBatch = state.esqlRowBatch.length - alertEventsBatch.length;

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch },
        meta: {
          counters: {
            [RULE_EXECUTION_COUNTERS.groupsDroppedByLimit]: droppedInBatch,
          },
        },
      };
    });

    return forwardThenFinalize(built, {
      seed: 0,
      accumulate: (dropped, state) =>
        dropped + ((state.esqlRowBatch?.length ?? 0) - (state.alertEventsBatch?.length ?? 0)),
      finalize: (droppedGroupCount, lastState) => {
        if (droppedGroupCount > 0) {
          step.logger.warn({
            message: `[${step.name}] Rule ${lastState.input.ruleId} (space ${lastState.input.spaceId}) exceeded maxGroupsPerExecution=${step.maxGroupsPerExecution}; dropped ${droppedGroupCount} new group(s) this run`,
          });
        }
        return undefined;
      },
    });
  }
}
