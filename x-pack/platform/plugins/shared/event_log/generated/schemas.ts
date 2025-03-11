/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

// provides TypeScript and config-schema interfaces for ECS for use with
// the event log

import { schema, TypeOf } from '@kbn/config-schema';
import semver from 'semver';

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>;
};

export const ECS_VERSION = '1.8.0';

// types and config-schema describing the es structures
export type IValidatedEvent = TypeOf<typeof EventSchema>;
export type IEvent = DeepPartial<DeepWriteable<IValidatedEvent>>;

export const EventSchema = schema.maybe(
  schema.object({
    '@timestamp': ecsDate(),
    message: ecsString(),
    tags: ecsStringMulti(),
    ecs: schema.maybe(
      schema.object({
        version: ecsString(),
      })
    ),
    error: schema.maybe(
      schema.object({
        code: ecsString(),
        id: ecsString(),
        message: ecsString(),
        stack_trace: ecsString(),
        type: ecsString(),
      })
    ),
    event: schema.maybe(
      schema.object({
        action: ecsString(),
        category: ecsStringMulti(),
        code: ecsString(),
        created: ecsDate(),
        dataset: ecsString(),
        duration: ecsStringOrNumber(),
        end: ecsDate(),
        hash: ecsString(),
        id: ecsString(),
        ingested: ecsDate(),
        kind: ecsString(),
        module: ecsString(),
        original: ecsString(),
        outcome: ecsString(),
        provider: ecsString(),
        reason: ecsString(),
        reference: ecsString(),
        risk_score: ecsNumber(),
        risk_score_norm: ecsNumber(),
        sequence: ecsStringOrNumber(),
        severity: ecsStringOrNumber(),
        start: ecsDate(),
        timezone: ecsString(),
        type: ecsStringMulti(),
        url: ecsString(),
      })
    ),
    log: schema.maybe(
      schema.object({
        level: ecsString(),
        logger: ecsString(),
      })
    ),
    rule: schema.maybe(
      schema.object({
        author: ecsStringMulti(),
        category: ecsString(),
        description: ecsString(),
        id: ecsString(),
        license: ecsString(),
        name: ecsString(),
        reference: ecsString(),
        ruleset: ecsString(),
        uuid: ecsString(),
        version: ecsString(),
      })
    ),
    user: schema.maybe(
      schema.object({
        name: ecsString(),
        id: ecsString(),
      })
    ),
    kibana: schema.maybe(
      schema.object({
        server_uuid: ecsString(),
        task: schema.maybe(
          schema.object({
            id: ecsString(),
            scheduled: ecsDate(),
            schedule_delay: ecsStringOrNumber(),
          })
        ),
        alerting: schema.maybe(
          schema.object({
            instance_id: ecsString(),
            action_group_id: ecsString(),
            action_subgroup: ecsString(),
            status: ecsString(),
            outcome: ecsString(),
            summary: schema.maybe(
              schema.object({
                new: schema.maybe(
                  schema.object({
                    count: ecsStringOrNumber(),
                  })
                ),
                ongoing: schema.maybe(
                  schema.object({
                    count: ecsStringOrNumber(),
                  })
                ),
                recovered: schema.maybe(
                  schema.object({
                    count: ecsStringOrNumber(),
                  })
                ),
              })
            ),
          })
        ),
        alert: schema.maybe(
          schema.object({
            flapping: ecsBoolean(),
            maintenance_window_ids: ecsStringMulti(),
            uuid: ecsString(),
            rule: schema.maybe(
              schema.object({
                consumer: ecsString(),
                gap: schema.maybe(
                  schema.object({
                    status: ecsString(),
                    range: ecsDateRange(),
                    filled_intervals: ecsDateRangeMulti(),
                    unfilled_intervals: ecsDateRangeMulti(),
                    in_progress_intervals: ecsDateRangeMulti(),
                    total_gap_duration_ms: ecsStringOrNumber(),
                    filled_duration_ms: ecsStringOrNumber(),
                    unfilled_duration_ms: ecsStringOrNumber(),
                    in_progress_duration_ms: ecsStringOrNumber(),
                  })
                ),
                execution: schema.maybe(
                  schema.object({
                    uuid: ecsString(),
                    status: ecsString(),
                    status_order: ecsStringOrNumber(),
                    backfill: schema.maybe(
                      schema.object({
                        id: ecsString(),
                        start: ecsDate(),
                        interval: ecsString(),
                      })
                    ),
                    metrics: schema.maybe(
                      schema.object({
                        number_of_triggered_actions: ecsStringOrNumber(),
                        number_of_generated_actions: ecsStringOrNumber(),
                        alert_counts: schema.maybe(
                          schema.object({
                            active: ecsStringOrNumber(),
                            new: ecsStringOrNumber(),
                            recovered: ecsStringOrNumber(),
                          })
                        ),
                        number_of_delayed_alerts: ecsStringOrNumber(),
                        number_of_searches: ecsStringOrNumber(),
                        total_indexing_duration_ms: ecsStringOrNumber(),
                        es_search_duration_ms: ecsStringOrNumber(),
                        total_search_duration_ms: ecsStringOrNumber(),
                        execution_gap_duration_s: ecsStringOrNumber(),
                        gap_range: ecsDateRange(),
                        rule_type_run_duration_ms: ecsStringOrNumber(),
                        process_alerts_duration_ms: ecsStringOrNumber(),
                        trigger_actions_duration_ms: ecsStringOrNumber(),
                        process_rule_duration_ms: ecsStringOrNumber(),
                        claim_to_start_duration_ms: ecsStringOrNumber(),
                        persist_alerts_duration_ms: ecsStringOrNumber(),
                        prepare_rule_duration_ms: ecsStringOrNumber(),
                        total_run_duration_ms: ecsStringOrNumber(),
                        total_enrichment_duration_ms: ecsStringOrNumber(),
                      })
                    ),
                  })
                ),
                revision: ecsStringOrNumber(),
                rule_type_id: ecsString(),
              })
            ),
          })
        ),
        saved_objects: schema.maybe(
          schema.arrayOf(
            schema.object({
              rel: ecsString(),
              namespace: ecsString(),
              id: ecsString(),
              type: ecsString(),
              type_id: ecsString(),
              space_agnostic: ecsBoolean(),
            })
          )
        ),
        space_ids: ecsStringMulti(),
        version: ecsVersion(),
        action: schema.maybe(
          schema.object({
            name: ecsString(),
            id: ecsString(),
            type_id: ecsString(),
            execution: schema.maybe(
              schema.object({
                source: ecsString(),
                uuid: ecsString(),
                gen_ai: schema.maybe(
                  schema.object({
                    usage: schema.maybe(
                      schema.object({
                        prompt_tokens: ecsStringOrNumber(),
                        completion_tokens: ecsStringOrNumber(),
                        total_tokens: ecsStringOrNumber(),
                      })
                    ),
                  })
                ),
                usage: schema.maybe(
                  schema.object({
                    request_body_bytes: ecsStringOrNumber(),
                  })
                ),
              })
            ),
          })
        ),
        user_api_key: schema.maybe(
          schema.object({
            id: ecsString(),
            name: ecsString(),
          })
        ),
      })
    ),
  })
);

function ecsStringMulti() {
  return schema.maybe(schema.arrayOf(schema.string()));
}

function ecsString() {
  return schema.maybe(schema.string());
}

function ecsNumber() {
  return schema.maybe(schema.number());
}

function ecsStringOrNumber() {
  return schema.maybe(schema.oneOf([schema.string(), schema.number()]));
}

function ecsDate() {
  return schema.maybe(schema.string({ validate: validateDate }));
}

function ecsBoolean() {
  return schema.maybe(schema.boolean());
}

function ecsDateRangeBase() {
  return schema.object({ gte: ecsDate(), lte: ecsDate() });
}

function ecsDateRange() {
  return schema.maybe(ecsDateRangeBase());
}

function ecsDateRangeMulti() {
  return schema.maybe(schema.arrayOf(ecsDateRangeBase()));
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validateDate(isoDate: string) {
  if (ISO_DATE_PATTERN.test(isoDate)) return;
  return 'string is not a valid ISO date: ' + isoDate;
}

function ecsVersion() {
  return schema.maybe(schema.string({ validate: validateVersion }));
}

function validateVersion(version: string) {
  if (semver.valid(version)) return;
  return 'string is not a valid version: ' + version;
}
