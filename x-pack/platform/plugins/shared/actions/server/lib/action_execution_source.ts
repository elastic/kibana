/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectReference } from '@kbn/core/server';

export enum ActionExecutionSourceType {
  SAVED_OBJECT = 'SAVED_OBJECT',
  HTTP_REQUEST = 'HTTP_REQUEST',
  NOTIFICATION = 'NOTIFICATION',
  BACKGROUND_TASK = 'BACKGROUND_TASK',
}

export interface ActionExecutionSource<T> {
  type: ActionExecutionSourceType;
  source: T;
}
export type HttpRequestExecutionSource = ActionExecutionSource<KibanaRequest>;
export type SavedObjectExecutionSource = ActionExecutionSource<Omit<SavedObjectReference, 'name'>>;

export interface BackgroundTaskSource {
  taskId: string;
  taskType: string;
}
export type BackgroundTaskExecutionSource = ActionExecutionSource<BackgroundTaskSource>;
export interface NotificationSource {
  requesterId: string;
  connectorId: string;
}
export type NotificationExecutionSource = ActionExecutionSource<NotificationSource>;

export function asHttpRequestExecutionSource(source: KibanaRequest): HttpRequestExecutionSource {
  return {
    type: ActionExecutionSourceType.HTTP_REQUEST,
    source,
  };
}

export function asEmptySource(type: ActionExecutionSourceType): ActionExecutionSource<{}> {
  return {
    type,
    source: {},
  };
}

export function asSavedObjectExecutionSource(
  source: Omit<SavedObjectReference, 'name'>
): SavedObjectExecutionSource {
  return {
    type: ActionExecutionSourceType.SAVED_OBJECT,
    source,
  };
}

export function asNotificationExecutionSource(
  source: NotificationSource
): NotificationExecutionSource {
  return {
    type: ActionExecutionSourceType.NOTIFICATION,
    source,
  };
}

export function asBackgroundTaskExecutionSource(
  source: BackgroundTaskSource
): BackgroundTaskExecutionSource {
  return {
    type: ActionExecutionSourceType.BACKGROUND_TASK,
    source,
  };
}

export function isHttpRequestExecutionSource(
  executionSource?: ActionExecutionSource<unknown>
): executionSource is HttpRequestExecutionSource {
  return executionSource?.type === ActionExecutionSourceType.HTTP_REQUEST;
}

export function isSavedObjectExecutionSource(
  executionSource?: ActionExecutionSource<unknown>
): executionSource is SavedObjectExecutionSource {
  return executionSource?.type === ActionExecutionSourceType.SAVED_OBJECT;
}

export function isNotificationExecutionSource(
  executionSource?: ActionExecutionSource<unknown>
): executionSource is NotificationExecutionSource {
  return executionSource?.type === ActionExecutionSourceType.NOTIFICATION;
}

export function isBackgroundTaskExecutionSource(
  executionSource?: ActionExecutionSource<unknown>
): executionSource is BackgroundTaskExecutionSource {
  return executionSource?.type === ActionExecutionSourceType.BACKGROUND_TASK;
}
