/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatEvent } from '@kbn/onechat-common';

/**
 * Public-facing events, as received by the API consumer.
 */
export type OnechatToolEvent<
  TEventType extends string = string,
  TData extends Record<string, any> = Record<string, any>
> = OnechatEvent<TEventType, TData>;

/**
 * Internal-facing events, as emitted by tool or agent owners.
 */
export type InternalToolEvent<
  TEventType extends string = string,
  TData extends Record<string, any> = Record<string, any>
> = OnechatToolEvent<TEventType, TData>;
/**
 * Event handler function to listen to run events during execution of tools, agents or other onechat primitives.
 */
export type ToolEventHandlerFn = (event: OnechatToolEvent) => void;

/**
 * Event emitter function, exposed from tool or agent runnable context.
 */
export type ToolEventEmitterFn = (event: InternalToolEvent) => void;

export interface ToolEventEmitter {
  emit: ToolEventEmitterFn;
}
