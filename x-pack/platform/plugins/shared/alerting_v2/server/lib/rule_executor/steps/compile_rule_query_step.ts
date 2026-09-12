/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { inject, injectable } from 'inversify';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { BuilderQueryGenerationError } from '@kbn/alerting-v2-rule-builders';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError } from '@kbn/zod/v4';
import type { OpaqueBuilderFields } from '../../builder_types';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { guardedMapStep } from '../stream_utils';
import { BuilderTypeRegistry } from '../../builder_types';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { parseDurationToMs } from '../../duration';
import {
  adaptToKind,
  assertGeneratedQueryIsValid,
} from '../../builder_types/generated_query_validation';

/**
 * Resolves the run's effective query and time window, placing them on pipeline
 * state for every downstream step to consume.
 *
 * Two branches:
 *
 * - **Stored-query** (plain ES|QL rule or write-time builder rule): passes the
 *   stored `rule.query` through as the effective query unchanged.
 *
 * - **Execution-time builder** (`compilation: 'execution_time'`): resolves the
 *   type from the registry, parses the stored `builder_fields`, calls
 *   `generateQuery` with the compilation context (including the run's time
 *   window), and validates the result.
 *
 * Every compilation failure is a user-source run failure (TaskErrorSource.USER)
 * — never a silent pipeline halt. The failure propagates through the pipeline's
 * error handler, publishes `rule.execution.failed`, and Task Manager records a
 * failed run.
 *
 * Ref: rule-execution-logic.md "The compile step" and "Compilation failures"
 */
@injectable()
export class CompileRuleQueryStep implements RuleExecutionStep {
  public readonly name = 'compile_rule_query';

  constructor(@inject(BuilderTypeRegistry) private readonly registry: BuilderTypeRegistry) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedMapStep(streamState, ['rule'], async (state) => {
      const { rule } = state;

      // 1. Resolve the run's time window once. start is exclusive, end is inclusive.
      //    Derived exactly as getQueryPayload does, so the range filter attached
      //    downstream uses the same boundaries.
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;
      const startIso = new Date(now - parseDurationToMs(lookbackWindow)).toISOString();
      const executionWindow = { start: startIso, end: nowIso } as const;

      const builderType = rule.metadata.builder_type;

      // 2a. No builder type: plain ES|QL rule. Pass through the stored query.
      if (!builderType) {
        if (!rule.query) {
          throw createTaskRunError(
            Boom.badRequest(
              `Rule "${rule.id}" has no stored query and its builder type does not compile at execution time.`,
              { code: ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG }
            ) as Error,
            TaskErrorSource.USER
          );
        }
        return {
          type: 'continue',
          state: { ...state, effectiveQuery: rule.query, executionWindow },
        };
      }

      const definition = step.registry.get(builderType);

      // 2b. Builder type not registered: fail the run as a user-source error.
      //     The owning plugin may be disabled; that is the designed steady state.
      if (!definition) {
        throw createTaskRunError(
          Boom.badRequest(
            `Unknown rule builder type "${builderType}". The builder type is not registered.`,
            {
              code: ALERTING_ERROR_CODES.UNKNOWN_BUILDER_TYPE,
              details: { builder_type: builderType },
            }
          ) as Error,
          TaskErrorSource.USER
        );
      }

      // 2c. Write-time builder: query was compiled and stored at write time.
      if (definition.compilation !== 'execution_time') {
        if (!rule.query) {
          throw createTaskRunError(
            Boom.badRequest(
              `Rule "${rule.id}" has no stored query and its builder type does not compile at execution time.`,
              { code: ALERTING_ERROR_CODES.INVALID_RULE_QUERY_CONFIG }
            ) as Error,
            TaskErrorSource.USER
          );
        }
        return {
          type: 'continue',
          state: { ...state, effectiveQuery: rule.query, executionWindow },
        };
      }

      // 2d. Execution-time builder: compile from stored builder_fields on this run.
      const builderFields = rule.metadata.builder_fields;

      // Parse stored builder_fields against the type's registered schema. Execution
      // is a read-only pass, and stored fields may predate a schema change — a rule
      // whose fields no longer parse must fail its run rather than compile a wrong query.
      let parsedFields: unknown;
      {
        let parseResult;
        try {
          parseResult = definition.builderFieldsSchema.safeParse(builderFields);
        } catch (parseError) {
          const message = parseError instanceof Error ? parseError.message : String(parseError);
          throw createTaskRunError(
            Boom.badRequest(
              `builder_fields for builder type "${builderType}" failed validation: ${message}`,
              {
                code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
                details: { builder_type: builderType },
              }
            ) as Error,
            TaskErrorSource.USER
          );
        }

        if (!parseResult.success) {
          throw createTaskRunError(
            Boom.badRequest(
              `builder_fields for builder type "${builderType}" are invalid: ${stringifyZodError(
                parseResult.error
              )}`,
              {
                code: ALERTING_ERROR_CODES.INVALID_BUILDER_FIELDS,
                details: { builder_type: builderType, errors: treeifyError(parseResult.error) },
              }
            ) as Error,
            TaskErrorSource.USER
          );
        }

        parsedFields = parseResult.data;
      }

      // Call generateQuery with the compilation context. The run member carries the
      // resolved window so the generator can derive time-relative boundaries without
      // reading the clock itself.
      let generated;
      try {
        generated = await definition.generateQuery({
          fields: parsedFields as OpaqueBuilderFields,
          rule: {
            id: rule.id,
            kind: rule.kind,
            schedule: rule.schedule,
            time_field: rule.time_field,
          },
          run: { now: nowIso, window: executionWindow },
        });
      } catch (genError) {
        // Propagate Boom errors unchanged (they already carry the right code).
        if (Boom.isBoom(genError)) {
          throw createTaskRunError(genError as Error, TaskErrorSource.USER);
        }

        const message =
          genError instanceof Error ? genError.message : String(genError);

        throw createTaskRunError(
          Boom.badRequest(
            `Rule builder "${builderType}" could not generate a query: ${message}`,
            {
              code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
              details: {
                builder_type: builderType,
                ...(genError instanceof BuilderQueryGenerationError &&
                genError.path !== undefined
                  ? { path: genError.path }
                  : {}),
              },
            }
          ) as Error,
          TaskErrorSource.USER
        );
      }

      // Validate the compile result. Three checks, all in the design:
      //   1. No-overrides rule (execution-time types only): the result must not
      //      carry time_field or grouping — those must be derived at write time
      //      via deriveRuleFields, not set per-run.
      //   2. adaptToKind: flatten composed queries for signal rules; reject a
      //      recovery block on a signal rule.
      //   3. GENERATED_QUERY_INVARIANTS: the same invariants the write path enforces.
      try {
        if (generated.time_field !== undefined || generated.grouping !== undefined) {
          throw Boom.badRequest(
            `The "${builderType}" rule builder returned time_field or grouping overrides at ` +
              `execution time. These fields must be derived at write time via deriveRuleFields.`,
            {
              code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
              details: { builder_type: builderType },
            }
          );
        }

        const adapted = adaptToKind(generated, rule.kind, builderType);

        assertGeneratedQueryIsValid(
          {
            kind: rule.kind,
            query: adapted.query,
            recovery_strategy: rule.recovery_strategy,
            no_data_strategy: rule.no_data_strategy,
          },
          builderType
        );

        return {
          type: 'continue',
          state: { ...state, effectiveQuery: adapted.query, executionWindow },
        };
      } catch (validationError) {
        throw createTaskRunError(
          (Boom.isBoom(validationError)
            ? validationError
            : Boom.badRequest(
                `The "${builderType}" rule builder generated an invalid query.`,
                {
                  code: ALERTING_ERROR_CODES.BUILDER_QUERY_GENERATION_FAILED,
                  details: { builder_type: builderType },
                }
              )) as Error,
          TaskErrorSource.USER
        );
      }
    });
  }
}
