/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { Query, ReadableQuery, Recovery, RuleKind } from '@kbn/alerting-v2-schemas';

/** The rule fields a builder generates from its params. */
export interface BuiltRuleParts {
  readonly query: Query;
  readonly time_field: string;
  readonly grouping?: { fields: string[] };
  readonly recovery?: Recovery;
}

/** The stored rule fields a builder reads its params back from. */
export interface BuilderRuleSource {
  readonly query: ReadableQuery;
  readonly recovery?: Recovery;
  readonly time_field?: string;
}

/**
 * A builder's params schema. It must be an object schema: the agent tools are derived
 * from its fields, their `.describe()` text, and whether each is optional or defaulted.
 */
export type RuleBuilderParamsSchema<TParams> = z.ZodType<TParams> & {
  readonly shape: Readonly<Record<string, z.core.$ZodType>>;
};

/**
 * Changes to a builder's params: each field sent replaces the current value wholesale,
 * omitted fields are kept, and `null` removes an optional field.
 */
export type RuleBuilderParamsPatch = Readonly<Record<string, unknown>>;

/** A described set of params, shown to agents and used as a round-trip fixture. */
export interface RuleBuilderExample<TParams> {
  readonly description: string;
  readonly params: TParams;
}

/** What a builder author provides; see `defineRuleBuilder`. */
export interface RuleBuilderDefinition<TParams = unknown, TFormState = unknown> {
  /** Stored in `metadata.builder.type` on rules authored with this builder; snake_case. */
  readonly type: string;
  readonly title: string;
  /** What the builder produces. */
  readonly summary: string;
  /** When an agent should choose this builder over the others. */
  readonly whenToUse: string;
  /**
   * Agent-facing params: bounded, described, and free of UI-only fields such as ids.
   * Optional fields can be removed by an update; defaulted fields can only be replaced.
   */
  readonly paramsSchema: RuleBuilderParamsSchema<TParams>;
  /** Every example must pass `validate` and round-trip through `build` and `parse`. */
  readonly examples: ReadonlyArray<RuleBuilderExample<TParams>>;
  /** Adds the UI-only fields (such as list item ids) the rule form needs. */
  readonly toFormState: (params: TParams) => TFormState;
  /** Drops the UI-only fields from the rule form state. */
  readonly fromFormState: (state: TFormState) => TParams;
  /** Human-readable reasons the params can't produce a rule; empty when valid. */
  readonly validate: (params: TParams) => string[];
  /** Generates the rule fields. Call only with params that pass `validate`. */
  readonly build: (params: TParams, options: { kind: RuleKind }) => BuiltRuleParts;
  /** Reads params back from a stored rule, or `null` when the rule doesn't match this builder. */
  readonly parse: (rule: BuilderRuleSource) => TParams | null;
}

/** Describes a rule builder type to both the rule form and Agent Builder. */
export interface RuleBuilderType<TParams = unknown, TFormState = unknown>
  extends RuleBuilderDefinition<TParams, TFormState> {
  /** Changes to existing params, derived from `paramsSchema` without its defaults. */
  readonly paramsPatchSchema: z.ZodType<RuleBuilderParamsPatch>;
}
