/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiIsOfType,
  apiPublishesTitle,
  apiPublishesUnifiedSearch,
} from '@kbn/presentation-publishing';
import { isObject } from 'lodash';
import type {
  LensApiCallbacks,
  LensPublicCallbacks,
  LensComponentForwardedProps,
  UserMessage,
} from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';

function apiHasLensCallbacks(api: unknown): api is LensApiCallbacks {
  const fns = [
    'getSavedVis',
    'getViewUnderlyingDataArgs',
    'isTextBasedLanguage',
    'getTextBasedLanguage',
  ] as Array<keyof LensApiCallbacks>;
  return fns.every((fn) => typeof (api as LensApiCallbacks)[fn] === 'function');
}

export const isLensApi = (api: unknown): api is LensApi => {
  return Boolean(
    api &&
      apiIsOfType(api, 'lens') &&
      'canViewUnderlyingData$' in api &&
      apiHasLensCallbacks(api) &&
      apiPublishesTitle(api) &&
      apiPublishesUnifiedSearch(api)
  );
};

export function apiHasLensComponentCallbacks(api: unknown): api is LensPublicCallbacks {
  return (
    isObject(api) &&
    ['onFilter', 'onBrushEnd', 'onLoad', 'onTableRowClick', 'onBeforeBadgesRender'].some((fn) =>
      Object.hasOwn(api, fn)
    )
  );
}

export function apiHasUserMessages(api: unknown): api is { userMessages?: UserMessage[] } {
  return isObject(api) && Object.hasOwn(api, 'userMessages');
}

export function apiHasLensComponentProps(api: unknown): api is LensComponentForwardedProps {
  return (
    isObject(api) &&
    ['style', 'className', 'noPadding', 'viewMode', 'abortController'].some((prop) =>
      Object.hasOwn(api, prop)
    )
  );
}

export function apiHasAbortController(api: unknown): api is { abortController: AbortController } {
  return isObject(api) && Object.hasOwn(api, 'abortController');
}

export function apiHasLastReloadRequestTime(
  api: unknown
): api is { lastReloadRequestTime: number } {
  return isObject(api) && Object.hasOwn(api, 'lastReloadRequestTime');
}

export function apiPublishesInlineEditingCapabilities(
  api: unknown
): api is { canEditInline: boolean } {
  return isObject(api) && Object.hasOwn(api, 'canEditInline');
}

/**
 * Type guard to check if the parent API (e.g., Dashboard) exposes whether
 * the current user can edit it based on access control settings.
 */
export function apiPublishesIsEditableByUser(api: unknown): api is { isEditableByUser: boolean } {
  return (
    isObject(api) && typeof (api as { isEditableByUser?: boolean }).isEditableByUser === 'boolean'
  );
}

/**
 * Best-effort type guard to check if adapters is a Partial<DefaultInspectorAdapters>.
 * Validates that the object only contains known adapter properties.
 * Not a perfect check, but necessary due to generic typing constraints
 * in the current codebase where adapters can be typed as `unknown`.
 */
export function isPartialInspectorAdapters(
  adapters: unknown
): adapters is Partial<DefaultInspectorAdapters> {
  if (!isObject(adapters)) return false;
  const validKeys = new Set(['requests', 'tables', 'expression']);
  return Object.keys(adapters).every((key) => validKeys.has(key));
}

/**
 * Best-effort type guard to check if adapters has a requests property.
 * Not a perfect check, but necessary due to generic typing constraints
 * in the current codebase where adapters can be typed as `unknown`.
 */
export function hasRequestsAdapter(adapters: unknown): adapters is DefaultInspectorAdapters {
  return isObject(adapters) && Boolean((adapters as DefaultInspectorAdapters).requests);
}

/**
 * Best-effort type guard to check if adapters has a tables property.
 * Not a perfect check, but necessary due to generic typing constraints
 * in the current codebase where adapters can be typed as `unknown`.
 */
export function hasTablesAdapter(adapters: unknown): adapters is DefaultInspectorAdapters {
  return isObject(adapters) && Boolean((adapters as DefaultInspectorAdapters).tables);
}
