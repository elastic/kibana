/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

export type ResolverValidationResult<TValidatedData = unknown> =
  | { valid: true; data: TValidatedData }
  | { valid: false; error: string };

export interface ResolverFormatContext {
  request: KibanaRequest;
  spaceId: string;
}

export interface ResolverResolveContext extends ResolverFormatContext {
  /**
   * Saved objects client scoped to the current user.
   * Optional to keep the resolver contract generic.
   */
  savedObjectsClient?: SavedObjectsClientContract;
}

/**
 * Return value of resolver `format` — plain representation for the LLM.
 */
export interface ResolverRepresentation {
  type: 'text';
  value: string;
}

/**
 * Single attachment instance as seen by bounded tools — no conversation_id.
 */
export interface ResolverBoundedToolItemSnapshot<TContent = unknown> {
  type: string;
  /** Present for by-reference attachments; omitted for inline attachments. */
  origin?: string;
  data: TContent;
  /** Always the stored attachment.id — use as tool name suffix / log identifier. */
  instanceId: string;
}

/**
 * Snapshot passed to isStale — no VersionedAttachment / versions[].
 */
export interface ResolverStaleCheckItem<TContent = unknown> {
  id: string;
  type: string;
  origin: string;
  /** Latest-version data (from the runner's `getLatestVersion` call). */
  data: TContent;
  /** Timestamp when the origin was last snapshotted. */
  origin_snapshot_at?: string;
}

/**
 * Server-side definition of an attachment / resolver type (registry contract).
 *
 * Registered via `agentContextLayer.registerResolverType()` during plugin setup.
 *
 * @typeParam TBoundedTool — Instance-scoped bounded tools (e.g. Agent Builder tool union).
 */
export interface ResolverTypeDefinition<
  TType extends string = string,
  TContent = unknown,
  TBoundedTool = unknown
> {
  id: TType;

  validate: (input: unknown) => MaybePromise<ResolverValidationResult<TContent>>;

  /**
   * Optional validation for by-reference attachments before `resolve(origin, ...)`.
   * When present, the attachment `origin` value is validated first; on success,
   * `data` (typically the normalized origin string) is passed to `resolve`.
   */
  validateOrigin?: (
    input: unknown
  ) => MaybePromise<ResolverValidationResult<string>>;

  format: (
    item: { id: string; type: string; data: TContent },
    context: ResolverFormatContext
  ) => MaybePromise<ResolverRepresentation>;

  resolve?: (origin: string, context: ResolverResolveContext) => MaybePromise<TContent | undefined>;

  isStale?: (
    item: ResolverStaleCheckItem<TContent>,
    context: ResolverResolveContext
  ) => MaybePromise<boolean>;

  getTools?: () => string[];

  getBoundedTools?: (
    item: ResolverBoundedToolItemSnapshot<TContent>,
    context: ResolverFormatContext
  ) => MaybePromise<TBoundedTool[]>;

  getAgentDescription?: () => string;

  isReadonly?: boolean;
}
