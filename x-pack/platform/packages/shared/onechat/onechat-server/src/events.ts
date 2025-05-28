/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatEvent } from '@kbn/onechat-common';
import type { RunContextStackEntry } from './runner';

export enum OnechatRunEventType {
  toolCall = 'toolCall',
  toolResponse = 'toolResponse',
}

/**
 * Base set of meta for all onechat run events.
 */
export interface OnechatRunEventMeta {
  /**
   * Current runId
   */
  runId: string;
  /**
   * Execution stack
   */
  stack: RunContextStackEntry[];
}

/**
 * Public-facing events, as received by the API consumer.
 */
export type OnechatRunEvent<
  TEventType extends string = string,
  TData extends Record<string, any> = Record<string, any>,
  TMeta extends OnechatRunEventMeta = OnechatRunEventMeta
> = OnechatEvent<TEventType, TData, TMeta>;

/**
 * Internal-facing events, as emitted by tool or agent owners.
 */
export type InternalRunEvent<
  TEventType extends string = string,
  TData extends Record<string, any> = Record<string, any>,
  TMeta extends Record<string, any> = Record<string, any>
> = Omit<OnechatEvent<TEventType, TData, TMeta>, 'meta'> & {
  meta?: TMeta;
};
/**
 * Event handler function to listen to run events during execution of tools, agents or other onechat primitives.
 */
export type RunEventHandlerFn = (event: OnechatRunEvent) => void;

/**
 * Event emitter function, exposed from tool or agent runnable context.
 */
export type RunEventEmitterFn = (event: InternalRunEvent) => void;

export interface RunEventEmitter {
  emit: RunEventEmitterFn;
}

// toolCall

export type ToolCallEvent = OnechatRunEvent<OnechatRunEventType.toolCall, ToolCallEventData>;

export interface ToolCallEventData {
  toolId: string;
  toolParams: Record<string, unknown>;
}

export const isToolCallEvent = (event: OnechatEvent<any, any, any>): event is ToolCallEvent => {
  return event.type === OnechatRunEventType.toolCall;
};

// toolResponse

export type ToolResponseEvent = OnechatRunEvent<
  OnechatRunEventType.toolResponse,
  ToolResponseEventData
>;

export interface ToolResponseEventData {
  toolId: string;
  toolResult: unknown;
}

export const isToolResponseEvent = (
  event: OnechatEvent<any, any, any>
): event is ToolResponseEvent => {
  return event.type === OnechatRunEventType.toolResponse;
};
