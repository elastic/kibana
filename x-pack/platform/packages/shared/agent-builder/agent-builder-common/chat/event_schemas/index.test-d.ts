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
 *
 * For schemas that use z.looseObject internally (execution_step, execution_terminated), the
 * loose fields infer as `{ [k: string]: unknown }` which is wider than the TS interface.
 * Direction A would fail for those fields even though the schema is correct, so only direction
 * B is asserted — it still catches the important half: the TS type must be assignable to the
 * schema (no required field missing).
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
declare const _userMessageA: _UserMessageA;
declare const _userMessageB: _UserMessageB;
true satisfies typeof _userMessageA;
true satisfies typeof _userMessageB;

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
declare const _executionStartedA: _ExecutionStartedA;
declare const _executionStartedB: _ExecutionStartedB;
true satisfies typeof _executionStartedA;
true satisfies typeof _executionStartedB;

// ---- execution_step -------------------------------------------------------
// columns uses z.custom<EsqlEsqlColumnInfo>; both directions hold.

type _ExecutionStepA = z.infer<typeof executionStepEventDataSchema> extends ExecutionStepEventData
  ? true
  : never;
type _ExecutionStepB = ExecutionStepEventData extends z.infer<typeof executionStepEventDataSchema>
  ? true
  : never;
declare const _executionStepA: _ExecutionStepA;
declare const _executionStepB: _ExecutionStepB;
true satisfies typeof _executionStepA;
true satisfies typeof _executionStepB;

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
declare const _executionTerminatedA: _ExecutionTerminatedA;
declare const _executionTerminatedB: _ExecutionTerminatedB;
true satisfies typeof _executionTerminatedA;
true satisfies typeof _executionTerminatedB;

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
declare const _executionFailedA: _ExecutionFailedA;
declare const _executionFailedB: _ExecutionFailedB;
true satisfies typeof _executionFailedA;
true satisfies typeof _executionFailedB;

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
declare const _executionAbortedA: _ExecutionAbortedA;
declare const _executionAbortedB: _ExecutionAbortedB;
true satisfies typeof _executionAbortedA;
true satisfies typeof _executionAbortedB;
