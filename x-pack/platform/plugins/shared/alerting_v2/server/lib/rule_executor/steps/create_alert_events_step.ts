/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import Boom from '@hapi/boom';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { OpaqueBuilderFields, RuleEventEnrichment } from '@kbn/alerting-v2-rule-builders';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  createAlertEventsBatchBuilder,
  resolveAlertEventType,
  type AlertEventsBatchBuilder,
  type BuildAlertEventsBaseOpts,
} from '../build_alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { forwardThenFinalize, guardedExpandStep } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';
import { ALERTING_ERROR_CODES, ALERTING_LOG_CODES } from '../../errors/error_codes';
import { BuilderTypeRegistry } from '../../builder_types';
import type { PluginConfig } from '../../../config';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  private readonly maxGroupsPerExecution: number;

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config'],
    @inject(BuilderTypeRegistry) private readonly registry: BuilderTypeRegistry
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
        // Resolve the enrichment hook once per run: look up the registered type
        // and create a pre-bound callback. A type with no hook pays nothing here.
        //
        // Registration rejects `enrichRuleEvent` on write-time types (mode
        // consistency check in assert_valid_definition.ts), so only
        // execution-time types reach this branch. For those types,
        // `state.parsedBuilderFields` is always set by CompileRuleQueryStep
        // and carries the fields already validated against the type's
        // `builderFieldsSchema`, satisfying the hook contract's "parsed builder
        // fields" requirement.
        //
        // Ref: rule-event-generation-logic.md "The hook contract"
        //      rule-event-generation-logic.md "Where the hook runs"
        let enrichRuleEvent: BuildAlertEventsBaseOpts['enrichRuleEvent'];
        const builderType = state.rule.metadata.builder_type;
        if (builderType) {
          const definition = step.registry.get(builderType);
          if (definition?.enrichRuleEvent) {
            const fields = (state.parsedBuilderFields ?? {}) as OpaqueBuilderFields;
            const ruleIdentity = {
              id: state.rule.id,
              signature_id: state.rule.metadata.signature_id ?? '',
              kind: state.rule.kind,
            };
            const hookFn = definition.enrichRuleEvent;
            const bt = builderType;
            // The try/catch is intentionally scoped to the hook call only. Any
            // throw from the hook is a deterministic user-source error
            // (RULE_EVENT_ENRICHMENT_FAILED). Faults elsewhere in buildBatch
            // (group hashing, document building) propagate with their own
            // classification.
            //
            // Ref: rule-event-generation-logic.md "Failure handling"
            enrichRuleEvent = (row: Readonly<Record<string, unknown>>): RuleEventEnrichment => {
              try {
                return hookFn({ fields, rule: ruleIdentity, row });
              } catch (hookError) {
                const msg = hookError instanceof Error ? hookError.message : String(hookError);
                throw createTaskRunError(
                  Boom.badRequest(
                    `Rule event enrichment hook for builder type "${bt}" threw: ${msg}`,
                    {
                      code: ALERTING_ERROR_CODES.RULE_EVENT_ENRICHMENT_FAILED,
                      details: { builder_type: bt },
                    }
                  ) as Error,
                  TaskErrorSource.USER
                );
              }
            };
          }
        }

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
          enrichRuleEvent,
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
