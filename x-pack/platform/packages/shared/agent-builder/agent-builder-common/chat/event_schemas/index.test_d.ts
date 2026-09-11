/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compile-time drift guards between Zod schemas and their corresponding TypeScript interfaces.
 *
 * Pattern:
 *   type _A = z.infer<typeof schema> extends TSType ? true : never;  // schema not too loose
 *   type _B = TSType extends z.infer<typeof schema> ? true : never;  // schema not too strict
 *   type _Keys = keyof TSType extends keyof z.infer<typeof schema> ? true : never;  // no missing optional fields
 *
 * For schemas that use z.looseObject internally (execution_step, execution_terminated), the
 * loose fields infer as `{ [k: string]: unknown }` which is wider than the TS interface.
 * Direction A would fail for those fields even though the schema is correct, so only direction
 * B is asserted — it still catches the important half: the TS type must be assignable to the
 * schema (no required field missing).
 *
 * The _Keys check catches optional fields present in the TS type but absent from the schema,
 * which the A/B directions miss (both directions pass when a field is optional on both sides).
 */

import type { z } from '@kbn/zod/v4';
import type {
  UserMessageEventData,
  PromptResponseEventData,
  ExecutionStartedEventData,
  ExecutionStepEventData,
  ExecutionTerminatedEventData,
  ExecutionFailedEventData,
  ExecutionAbortedEventData,
} from '../timeline_events';
import type { userMessageEventDataSchema } from './user_message';
import type { promptResponseEventDataSchema } from './prompt_response';
import type { executionStartedEventDataSchema } from './execution_started';
import type { executionStepEventDataSchema } from './execution_step';
import type { executionTerminatedEventDataSchema } from './execution_terminated';
import type { executionFailedEventDataSchema } from './execution_failed';
import type { executionAbortedEventDataSchema } from './execution_aborted';

// ---- user_message -------------------------------------------------------
// attachmentSchema uses z.custom<Attachment>() so the inferred type is Attachment itself;
// both directions hold.

type _UserMessageA = z.infer<typeof userMessageEventDataSchema> extends UserMessageEventData
  ? true
  : never;
type _UserMessageB = UserMessageEventData extends z.infer<typeof userMessageEventDataSchema>
  ? true
  : never;
type _UserMessageKeys = keyof UserMessageEventData extends keyof z.infer<
  typeof userMessageEventDataSchema
>
  ? true
  : never;
declare const _userMessageA: _UserMessageA;
declare const _userMessageB: _UserMessageB;
declare const _userMessageKeys: _UserMessageKeys;
true satisfies typeof _userMessageA;
true satisfies typeof _userMessageB;
true satisfies typeof _userMessageKeys;

// ---- prompt_response -------------------------------------------------------
// Fully precise; both directions hold.

type _PromptResponseA = z.infer<
  typeof promptResponseEventDataSchema
> extends PromptResponseEventData
  ? true
  : never;
type _PromptResponseB = PromptResponseEventData extends z.infer<
  typeof promptResponseEventDataSchema
>
  ? true
  : never;
declare const _promptResponseA: _PromptResponseA;
declare const _promptResponseB: _PromptResponseB;
true satisfies typeof _promptResponseA;
true satisfies typeof _promptResponseB;
// check that object keys from TS type match z schema
type _PromptResponseKeys = keyof PromptResponseEventData extends keyof z.infer<
  typeof promptResponseEventDataSchema
>
  ? true
  : never;
declare const _promptResponseKeys: _PromptResponseKeys;
true satisfies typeof _promptResponseKeys;

// ---- execution_started -------------------------------------------------------
// Fully precise; both directions hold.

type _ExecutionStartedA = z.infer<
  typeof executionStartedEventDataSchema
> extends ExecutionStartedEventData
  ? true
  : never;
type _ExecutionStartedB = ExecutionStartedEventData extends z.infer<
  typeof executionStartedEventDataSchema
>
  ? true
  : never;
type _ExecutionStartedKeys = keyof ExecutionStartedEventData extends keyof z.infer<
  typeof executionStartedEventDataSchema
>
  ? true
  : never;
declare const _executionStartedA: _ExecutionStartedA;
declare const _executionStartedB: _ExecutionStartedB;
declare const _executionStartedKeys: _ExecutionStartedKeys;
true satisfies typeof _executionStartedA;
true satisfies typeof _executionStartedB;
true satisfies typeof _executionStartedKeys;

// ---- execution_step -------------------------------------------------------
// columns uses z.custom<EsqlEsqlColumnInfo>; both directions hold.

type _ExecutionStepA = z.infer<typeof executionStepEventDataSchema> extends ExecutionStepEventData
  ? true
  : never;
type _ExecutionStepB = ExecutionStepEventData extends z.infer<typeof executionStepEventDataSchema>
  ? true
  : never;
type _ExecutionStepKeys = keyof ExecutionStepEventData extends keyof z.infer<
  typeof executionStepEventDataSchema
>
  ? true
  : never;
declare const _executionStepA: _ExecutionStepA;
declare const _executionStepB: _ExecutionStepB;
declare const _executionStepKeys: _ExecutionStepKeys;
true satisfies typeof _executionStepA;
true satisfies typeof _executionStepB;
true satisfies typeof _executionStepKeys;

// ---- execution_terminated -------------------------------------------------------
// Uses conversationRoundStepSchema; both directions hold.

type _ExecutionTerminatedA = z.infer<
  typeof executionTerminatedEventDataSchema
> extends ExecutionTerminatedEventData
  ? true
  : never;
type _ExecutionTerminatedB = ExecutionTerminatedEventData extends z.infer<
  typeof executionTerminatedEventDataSchema
>
  ? true
  : never;
type _ExecutionTerminatedKeys = keyof ExecutionTerminatedEventData extends keyof z.infer<
  typeof executionTerminatedEventDataSchema
>
  ? true
  : never;
declare const _executionTerminatedA: _ExecutionTerminatedA;
declare const _executionTerminatedB: _ExecutionTerminatedB;
declare const _executionTerminatedKeys: _ExecutionTerminatedKeys;
true satisfies typeof _executionTerminatedA;
true satisfies typeof _executionTerminatedB;
true satisfies typeof _executionTerminatedKeys;

// ---- execution_failed -------------------------------------------------------
// Fully precise; both directions hold.

type _ExecutionFailedA = z.infer<
  typeof executionFailedEventDataSchema
> extends ExecutionFailedEventData
  ? true
  : never;
type _ExecutionFailedB = ExecutionFailedEventData extends z.infer<
  typeof executionFailedEventDataSchema
>
  ? true
  : never;
type _ExecutionFailedKeys = keyof ExecutionFailedEventData extends keyof z.infer<
  typeof executionFailedEventDataSchema
>
  ? true
  : never;
declare const _executionFailedA: _ExecutionFailedA;
declare const _executionFailedB: _ExecutionFailedB;
declare const _executionFailedKeys: _ExecutionFailedKeys;
true satisfies typeof _executionFailedA;
true satisfies typeof _executionFailedB;
true satisfies typeof _executionFailedKeys;

// ---- execution_aborted -------------------------------------------------------
// Fully precise; both directions hold.

type _ExecutionAbortedA = z.infer<
  typeof executionAbortedEventDataSchema
> extends ExecutionAbortedEventData
  ? true
  : never;
type _ExecutionAbortedB = ExecutionAbortedEventData extends z.infer<
  typeof executionAbortedEventDataSchema
>
  ? true
  : never;
type _ExecutionAbortedKeys = keyof ExecutionAbortedEventData extends keyof z.infer<
  typeof executionAbortedEventDataSchema
>
  ? true
  : never;
declare const _executionAbortedA: _ExecutionAbortedA;
declare const _executionAbortedB: _ExecutionAbortedB;
declare const _executionAbortedKeys: _ExecutionAbortedKeys;
true satisfies typeof _executionAbortedA;
true satisfies typeof _executionAbortedB;
true satisfies typeof _executionAbortedKeys;
