/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isNil, isPlainObject, isString } from 'lodash';

/** Namespace for episodes list state inside the `_a` app-state blob */
export const EPISODES_LIST_APP_STATE_KEY = 'episodesList' as const;

/** Serialized in `_a` so “all statuses” survives reload (distinct from default Active) */
export const EPISODES_LIST_STATUS_URL_ALL = 'all' as const;

/** Default status; encoded entries equal to this are omitted from the URL. */
export const DEFAULT_EPISODES_LIST_STATUS = 'active' as const;

/** Default time range; encoded ranges equal to this are omitted from the URL. */
export const DEFAULT_EPISODES_LIST_TIME_RANGE = {
  from: 'now-24h',
  to: 'now',
} as const;

/**
 * Flat representation of the episodes-list state carried in
 * `_a.episodesList`. Framework-free so it can be shared between the URL-storage
 * codec (browser) and the locator (`getLocation`).
 */
export interface EpisodesListUrlState {
  status?: string | null;
  ruleId?: string | null;
  queryString?: string | null;
  tags?: string[] | null;
  assigneeUid?: string;
  timeRange?: { from: string; to: string };
  histogramBreakdownField?: string;
}

const isNonEmptyString = (v: unknown): v is string => isString(v) && v.trim().length > 0;

const isStringArray = (v: unknown): v is string[] =>
  isArray(v) && v.length > 0 && v.every(isString);

/**
 * Decodes the raw `_a.episodesList` record into a flat state object.
 *
 * A present-but-`undefined` `status` means “all statuses” (the URL carried the
 * {@link EPISODES_LIST_STATUS_URL_ALL} sentinel); an absent `status` key means
 * the caller wants the default and is left for the reader to fill in.
 */
export function decodeEpisodesListRecord(raw: unknown): EpisodesListUrlState {
  if (!isPlainObject(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const result: EpisodesListUrlState = {};

  if (o.status === EPISODES_LIST_STATUS_URL_ALL) {
    result.status = undefined;
  } else if (isNonEmptyString(o.status)) {
    result.status = o.status;
  }
  if (isNonEmptyString(o.ruleId)) {
    result.ruleId = o.ruleId;
  }
  if (isNonEmptyString(o.queryString)) {
    result.queryString = o.queryString.trim();
  }
  if (isStringArray(o.tags)) {
    result.tags = [...o.tags];
  }
  if (isNonEmptyString(o.assigneeUid)) {
    result.assigneeUid = o.assigneeUid;
  }
  if (isNonEmptyString(o.timeFrom) && isNonEmptyString(o.timeTo)) {
    result.timeRange = { from: o.timeFrom, to: o.timeTo };
  }
  if (isNonEmptyString(o.histBreakdown)) {
    result.histogramBreakdownField = o.histBreakdown;
  }
  return result;
}

/**
 * Encodes a flat state object into the `_a.episodesList` record. Default-valued
 * fields (status `active`, the default time range) are omitted so a pristine
 * list produces an empty record. The returned object is the inner record only —
 * callers wrap it under {@link EPISODES_LIST_APP_STATE_KEY}.
 */
export function encodeEpisodesListRecord(state: EpisodesListUrlState): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const { status } = state;
  if (isNil(status)) {
    result.status = EPISODES_LIST_STATUS_URL_ALL;
  } else if (isNonEmptyString(status) && status !== DEFAULT_EPISODES_LIST_STATUS) {
    result.status = status;
  }
  if (isNonEmptyString(state.ruleId)) {
    result.ruleId = state.ruleId;
  }
  if (isNonEmptyString(state.queryString)) {
    result.queryString = state.queryString.trim();
  }
  if (isStringArray(state.tags)) {
    result.tags = [...state.tags];
  }
  if (isNonEmptyString(state.assigneeUid)) {
    result.assigneeUid = state.assigneeUid;
  }
  const { timeRange } = state;
  if (
    timeRange &&
    (timeRange.from !== DEFAULT_EPISODES_LIST_TIME_RANGE.from ||
      timeRange.to !== DEFAULT_EPISODES_LIST_TIME_RANGE.to)
  ) {
    result.timeFrom = timeRange.from;
    result.timeTo = timeRange.to;
  }
  if (isNonEmptyString(state.histogramBreakdownField)) {
    result.histBreakdown = state.histogramBreakdownField;
  }
  return result;
}
