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
import { guardedExpandStep } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { PluginConfig } from '../../../config';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  private readonly maxDocSizeBytes: number;

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    this.maxDocSizeBytes = pluginConfigAccessor.get<PluginConfig>().rules.run.alerts.maxDocSize;
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;
    let buildBatch: AlertEventsBatchBuilder | undefined;
    let truncationWarningLogged = false;

    return guardedExpandStep(streamState, ['rule', 'esqlRowBatch'], async function* (state) {
      const eventType = resolveAlertEventType(state.rule);

      if (!buildBatch) {
        buildBatch = createAlertEventsBatchBuilder({
          ruleId: state.input.ruleId,
          spaceId: state.input.spaceId,
          ruleAttributes: state.rule,
          scheduledTimestamp: state.input.scheduledAt,
          ruleVersion: state.rule.metadata.version,
          type: eventType,
          maxDocSizeBytes: step.maxDocSizeBytes,
        });

        step.logger.debug({
          message: `[${step.name}] Created alert events builder for rule ${state.input.ruleId}`,
        });
      }

      const { alertEvents, truncatedEventsCount } = buildBatch([...state.esqlRowBatch]);

      if (truncatedEventsCount > 0 && !truncationWarningLogged) {
        truncationWarningLogged = true;
        step.logger.warn({
          message: `[${step.name}] Truncated the data payload of ${truncatedEventsCount} alert event(s) for rule ${state.input.ruleId}: rows exceeded the configured maxDocSize of ${step.maxDocSizeBytes} bytes`,
          code: ALERTING_LOG_CODES.RULE_EXECUTION_ALERT_DATA_PAYLOAD_TRUNCATED,
        });
      }

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch: alertEvents },
        ...(truncatedEventsCount > 0
          ? {
              meta: {
                counters: {
                  [RULE_EXECUTION_COUNTERS.alertEventsDataTruncated]: truncatedEventsCount,
                },
              },
            }
          : {}),
      };
    });
  }
}
