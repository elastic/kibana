/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
/** Kind */
export declare const ruleKindSchema: z.ZodEnum<{
  alert: 'alert';
  signal: 'signal';
}>;
export type RuleKind = z.infer<typeof ruleKindSchema>;
/** Recovery policy (optional) */
export declare const recoveryPolicyTypeSchema: z.ZodEnum<{
  query: 'query';
  no_breach: 'no_breach';
}>;
export declare const recoveryPolicyType: {
  query: 'query';
  no_breach: 'no_breach';
};
export type RecoveryPolicyType = z.infer<typeof recoveryPolicyTypeSchema>;
/**
 * The `.refine` method adds a custom validation to the schema.
 * In this case, it enforces that the `state_transition` property is only allowed when `kind` is "alert".
 * The predicate `data.kind === 'alert' || data.state_transition == null` means:
 * - If the rule kind is "alert", `state_transition` may be present (or absent).
 * - For any other `kind`, `state_transition` must be `null` or `undefined`.
 * If validation fails, the specified error message will be associated with the `state_transition` field.
 */
export declare const createRuleDataSchema: z.ZodObject<
  {
    kind: z.ZodEnum<{
      alert: 'alert';
      signal: 'signal';
    }>;
    metadata: z.ZodObject<
      {
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
      },
      z.core.$strict
    >;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<
      {
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
      },
      z.core.$strict
    >;
    evaluation: z.ZodObject<
      {
        query: z.ZodObject<
          {
            base: z.ZodString;
          },
          z.core.$strict
        >;
      },
      z.core.$strict
    >;
    recovery_policy: z.ZodOptional<
      z.ZodObject<
        {
          type: z.ZodEnum<{
            query: 'query';
            no_breach: 'no_breach';
          }>;
          query: z.ZodOptional<
            z.ZodObject<
              {
                base: z.ZodOptional<z.ZodString>;
              },
              z.core.$strict
            >
          >;
        },
        z.core.$strict
      >
    >;
    state_transition: z.ZodNullable<
      z.ZodOptional<
        z.ZodObject<
          {
            pending_operator: z.ZodOptional<
              z.ZodEnum<{
                AND: 'AND';
                OR: 'OR';
              }>
            >;
            pending_count: z.ZodOptional<z.ZodNumber>;
            pending_timeframe: z.ZodOptional<z.ZodString>;
            recovering_operator: z.ZodOptional<
              z.ZodEnum<{
                AND: 'AND';
                OR: 'OR';
              }>
            >;
            recovering_count: z.ZodOptional<z.ZodNumber>;
            recovering_timeframe: z.ZodOptional<z.ZodString>;
          },
          z.core.$strict
        >
      >
    >;
    grouping: z.ZodOptional<
      z.ZodObject<
        {
          fields: z.ZodArray<z.ZodString>;
        },
        z.core.$strict
      >
    >;
    no_data: z.ZodOptional<
      z.ZodObject<
        {
          behavior: z.ZodOptional<
            z.ZodEnum<{
              no_data: 'no_data';
              last_status: 'last_status';
              recover: 'recover';
            }>
          >;
          timeframe: z.ZodOptional<z.ZodString>;
        },
        z.core.$strict
      >
    >;
    artifacts: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
          },
          z.core.$strict
        >
      >
    >;
  },
  z.core.$strip
>;
export type CreateRuleData = z.infer<typeof createRuleDataSchema>;
/** Update rule API schema — all fields optional for partial updates */
export declare const updateRuleDataSchema: z.ZodObject<
  {
    metadata: z.ZodOptional<
      z.ZodObject<
        {
          name: z.ZodOptional<z.ZodString>;
          description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
          owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
          tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        },
        z.core.$strict
      >
    >;
    time_field: z.ZodOptional<z.ZodString>;
    schedule: z.ZodNullable<
      z.ZodOptional<
        z.ZodObject<
          {
            every: z.ZodOptional<z.ZodString>;
            lookback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
          },
          z.core.$strict
        >
      >
    >;
    evaluation: z.ZodOptional<
      z.ZodObject<
        {
          query: z.ZodOptional<
            z.ZodObject<
              {
                base: z.ZodOptional<z.ZodString>;
              },
              z.core.$strict
            >
          >;
        },
        z.core.$strict
      >
    >;
    recovery_policy: z.ZodNullable<
      z.ZodOptional<
        z.ZodObject<
          {
            type: z.ZodEnum<{
              query: 'query';
              no_breach: 'no_breach';
            }>;
            query: z.ZodOptional<
              z.ZodObject<
                {
                  base: z.ZodOptional<z.ZodString>;
                },
                z.core.$strict
              >
            >;
          },
          z.core.$strict
        >
      >
    >;
    state_transition: z.ZodNullable<
      z.ZodNullable<
        z.ZodOptional<
          z.ZodObject<
            {
              pending_operator: z.ZodOptional<
                z.ZodEnum<{
                  AND: 'AND';
                  OR: 'OR';
                }>
              >;
              pending_count: z.ZodOptional<z.ZodNumber>;
              pending_timeframe: z.ZodOptional<z.ZodString>;
              recovering_operator: z.ZodOptional<
                z.ZodEnum<{
                  AND: 'AND';
                  OR: 'OR';
                }>
              >;
              recovering_count: z.ZodOptional<z.ZodNumber>;
              recovering_timeframe: z.ZodOptional<z.ZodString>;
            },
            z.core.$strict
          >
        >
      >
    >;
    grouping: z.ZodNullable<
      z.ZodOptional<
        z.ZodObject<
          {
            fields: z.ZodArray<z.ZodString>;
          },
          z.core.$strict
        >
      >
    >;
    no_data: z.ZodNullable<
      z.ZodOptional<
        z.ZodObject<
          {
            behavior: z.ZodOptional<
              z.ZodEnum<{
                no_data: 'no_data';
                last_status: 'last_status';
                recover: 'recover';
              }>
            >;
            timeframe: z.ZodOptional<z.ZodString>;
          },
          z.core.$strict
        >
      >
    >;
    artifacts: z.ZodNullable<
      z.ZodOptional<
        z.ZodArray<
          z.ZodObject<
            {
              id: z.ZodString;
              type: z.ZodString;
              value: z.ZodString;
            },
            z.core.$strict
          >
        >
      >
    >;
    enabled: z.ZodOptional<z.ZodBoolean>;
  },
  z.core.$strip
>;
export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export declare const ruleResponseSchema: z.ZodObject<
  {
    kind: z.ZodEnum<{
      alert: 'alert';
      signal: 'signal';
    }>;
    metadata: z.ZodObject<
      {
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
      },
      z.core.$strict
    >;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<
      {
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
      },
      z.core.$strict
    >;
    evaluation: z.ZodObject<
      {
        query: z.ZodObject<
          {
            base: z.ZodString;
          },
          z.core.$strict
        >;
      },
      z.core.$strict
    >;
    recovery_policy: z.ZodOptional<
      z.ZodObject<
        {
          type: z.ZodEnum<{
            query: 'query';
            no_breach: 'no_breach';
          }>;
          query: z.ZodOptional<
            z.ZodObject<
              {
                base: z.ZodOptional<z.ZodString>;
              },
              z.core.$strict
            >
          >;
        },
        z.core.$strict
      >
    >;
    state_transition: z.ZodNullable<
      z.ZodOptional<
        z.ZodObject<
          {
            pending_operator: z.ZodOptional<
              z.ZodEnum<{
                AND: 'AND';
                OR: 'OR';
              }>
            >;
            pending_count: z.ZodOptional<z.ZodNumber>;
            pending_timeframe: z.ZodOptional<z.ZodString>;
            recovering_operator: z.ZodOptional<
              z.ZodEnum<{
                AND: 'AND';
                OR: 'OR';
              }>
            >;
            recovering_count: z.ZodOptional<z.ZodNumber>;
            recovering_timeframe: z.ZodOptional<z.ZodString>;
          },
          z.core.$strict
        >
      >
    >;
    grouping: z.ZodOptional<
      z.ZodObject<
        {
          fields: z.ZodArray<z.ZodString>;
        },
        z.core.$strict
      >
    >;
    no_data: z.ZodOptional<
      z.ZodObject<
        {
          behavior: z.ZodOptional<
            z.ZodEnum<{
              no_data: 'no_data';
              last_status: 'last_status';
              recover: 'recover';
            }>
          >;
          timeframe: z.ZodOptional<z.ZodString>;
        },
        z.core.$strict
      >
    >;
    artifacts: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
          },
          z.core.$strict
        >
      >
    >;
    id: z.ZodString;
    enabled: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedBy: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodString;
  },
  z.core.$strip
>;
export type RuleResponse = z.infer<typeof ruleResponseSchema>;
/** Sort field for find rules API. */
export declare const findRulesSortFieldSchema: z.ZodEnum<{
  kind: 'kind';
  name: 'name';
  enabled: 'enabled';
}>;
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;
/** Paginated list response schema. */
export declare const findRulesResponseSchema: z.ZodObject<
  {
    items: z.ZodArray<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            alert: 'alert';
            signal: 'signal';
          }>;
          metadata: z.ZodObject<
            {
              name: z.ZodString;
              description: z.ZodOptional<z.ZodString>;
              owner: z.ZodOptional<z.ZodString>;
              tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            },
            z.core.$strict
          >;
          time_field: z.ZodDefault<z.ZodString>;
          schedule: z.ZodObject<
            {
              every: z.ZodString;
              lookback: z.ZodOptional<z.ZodString>;
            },
            z.core.$strict
          >;
          evaluation: z.ZodObject<
            {
              query: z.ZodObject<
                {
                  base: z.ZodString;
                },
                z.core.$strict
              >;
            },
            z.core.$strict
          >;
          recovery_policy: z.ZodOptional<
            z.ZodObject<
              {
                type: z.ZodEnum<{
                  query: 'query';
                  no_breach: 'no_breach';
                }>;
                query: z.ZodOptional<
                  z.ZodObject<
                    {
                      base: z.ZodOptional<z.ZodString>;
                    },
                    z.core.$strict
                  >
                >;
              },
              z.core.$strict
            >
          >;
          state_transition: z.ZodNullable<
            z.ZodOptional<
              z.ZodObject<
                {
                  pending_operator: z.ZodOptional<
                    z.ZodEnum<{
                      AND: 'AND';
                      OR: 'OR';
                    }>
                  >;
                  pending_count: z.ZodOptional<z.ZodNumber>;
                  pending_timeframe: z.ZodOptional<z.ZodString>;
                  recovering_operator: z.ZodOptional<
                    z.ZodEnum<{
                      AND: 'AND';
                      OR: 'OR';
                    }>
                  >;
                  recovering_count: z.ZodOptional<z.ZodNumber>;
                  recovering_timeframe: z.ZodOptional<z.ZodString>;
                },
                z.core.$strict
              >
            >
          >;
          grouping: z.ZodOptional<
            z.ZodObject<
              {
                fields: z.ZodArray<z.ZodString>;
              },
              z.core.$strict
            >
          >;
          no_data: z.ZodOptional<
            z.ZodObject<
              {
                behavior: z.ZodOptional<
                  z.ZodEnum<{
                    no_data: 'no_data';
                    last_status: 'last_status';
                    recover: 'recover';
                  }>
                >;
                timeframe: z.ZodOptional<z.ZodString>;
              },
              z.core.$strict
            >
          >;
          artifacts: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  id: z.ZodString;
                  type: z.ZodString;
                  value: z.ZodString;
                },
                z.core.$strict
              >
            >
          >;
          id: z.ZodString;
          enabled: z.ZodBoolean;
          createdBy: z.ZodNullable<z.ZodString>;
          createdAt: z.ZodString;
          updatedBy: z.ZodNullable<z.ZodString>;
          updatedAt: z.ZodString;
        },
        z.core.$strip
      >
    >;
    total: z.ZodNumber;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
  },
  z.core.$strip
>;
export type FindRulesResponse = z.infer<typeof findRulesResponseSchema>;
/** Rule tags response schema. */
export declare const ruleTagsResponseSchema: z.ZodObject<
  {
    tags: z.ZodArray<z.ZodString>;
  },
  z.core.$strip
>;
/** Bulk operation response schema. */
export declare const bulkOperationResponseSchema: z.ZodObject<
  {
    rules: z.ZodArray<
      z.ZodObject<
        {
          kind: z.ZodEnum<{
            alert: 'alert';
            signal: 'signal';
          }>;
          metadata: z.ZodObject<
            {
              name: z.ZodString;
              description: z.ZodOptional<z.ZodString>;
              owner: z.ZodOptional<z.ZodString>;
              tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            },
            z.core.$strict
          >;
          time_field: z.ZodDefault<z.ZodString>;
          schedule: z.ZodObject<
            {
              every: z.ZodString;
              lookback: z.ZodOptional<z.ZodString>;
            },
            z.core.$strict
          >;
          evaluation: z.ZodObject<
            {
              query: z.ZodObject<
                {
                  base: z.ZodString;
                },
                z.core.$strict
              >;
            },
            z.core.$strict
          >;
          recovery_policy: z.ZodOptional<
            z.ZodObject<
              {
                type: z.ZodEnum<{
                  query: 'query';
                  no_breach: 'no_breach';
                }>;
                query: z.ZodOptional<
                  z.ZodObject<
                    {
                      base: z.ZodOptional<z.ZodString>;
                    },
                    z.core.$strict
                  >
                >;
              },
              z.core.$strict
            >
          >;
          state_transition: z.ZodNullable<
            z.ZodOptional<
              z.ZodObject<
                {
                  pending_operator: z.ZodOptional<
                    z.ZodEnum<{
                      AND: 'AND';
                      OR: 'OR';
                    }>
                  >;
                  pending_count: z.ZodOptional<z.ZodNumber>;
                  pending_timeframe: z.ZodOptional<z.ZodString>;
                  recovering_operator: z.ZodOptional<
                    z.ZodEnum<{
                      AND: 'AND';
                      OR: 'OR';
                    }>
                  >;
                  recovering_count: z.ZodOptional<z.ZodNumber>;
                  recovering_timeframe: z.ZodOptional<z.ZodString>;
                },
                z.core.$strict
              >
            >
          >;
          grouping: z.ZodOptional<
            z.ZodObject<
              {
                fields: z.ZodArray<z.ZodString>;
              },
              z.core.$strict
            >
          >;
          no_data: z.ZodOptional<
            z.ZodObject<
              {
                behavior: z.ZodOptional<
                  z.ZodEnum<{
                    no_data: 'no_data';
                    last_status: 'last_status';
                    recover: 'recover';
                  }>
                >;
                timeframe: z.ZodOptional<z.ZodString>;
              },
              z.core.$strict
            >
          >;
          artifacts: z.ZodOptional<
            z.ZodArray<
              z.ZodObject<
                {
                  id: z.ZodString;
                  type: z.ZodString;
                  value: z.ZodString;
                },
                z.core.$strict
              >
            >
          >;
          id: z.ZodString;
          enabled: z.ZodBoolean;
          createdBy: z.ZodNullable<z.ZodString>;
          createdAt: z.ZodString;
          updatedBy: z.ZodNullable<z.ZodString>;
          updatedAt: z.ZodString;
        },
        z.core.$strip
      >
    >;
    errors: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          error: z.ZodObject<
            {
              message: z.ZodString;
              statusCode: z.ZodNumber;
            },
            z.core.$strip
          >;
        },
        z.core.$strip
      >
    >;
    truncated: z.ZodOptional<z.ZodBoolean>;
    totalMatched: z.ZodOptional<z.ZodNumber>;
  },
  z.core.$strip
>;
export type BulkOperationResponse = z.infer<typeof bulkOperationResponseSchema>;
