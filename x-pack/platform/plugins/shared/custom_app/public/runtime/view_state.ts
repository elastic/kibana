/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import isEqual from 'lodash/isEqual';
import dateMath from '@kbn/datemath';
import { decode, encode } from '@kbn/rison';
import {
  MAX_STATE_STRING_LENGTH,
  getNodeBindings,
  getNodeChildren,
  type AppDocument,
  type AppNode,
  type StateValue,
} from '@kbn/custom-app-common';

/** What a link has to carry for another person, or a refresh, to see the app as it was left. */
export interface ViewState {
  /** The values of the app that are not as they start, by key. */
  values: Readonly<Record<string, StateValue>>;
  /** The id of the flyout that is open. */
  flyout?: string;
  /** The period, when it is not the one the app starts with. */
  timeRange?: { from: string; to: string };
}

export const EMPTY_VIEW: ViewState = { values: {} };

/** A link longer than this is not one that was made here, and is not read. */
const MAX_ENCODED_LENGTH = 4_000;
const MAX_TIME_LENGTH = 64;

const collectFormKeys = (node: AppNode): string[] => [
  ...(node.type === 'form' ? getNodeBindings(node) : []),
  ...getNodeChildren(node).flatMap(collectFormKeys),
];

/**
 * The values a view is made of: all of them but what is typed in a form, which is free text that
 * can be long or private, and does not belong in a link.
 */
export const getViewKeys = (document: Pick<AppDocument, 'state' | 'root'>): string[] => {
  const formKeys = new Set(collectFormKeys(document.root));
  return Object.keys(document.state).filter((key) => !formKeys.has(key));
};

/** Only what differs from how the app starts, so an app as it starts has an empty view. */
export const createView = (
  document: Pick<AppDocument, 'state' | 'root'>,
  state: Readonly<Record<string, StateValue>>,
  flyout: string | undefined,
  timeRange: { from: string; to: string },
  defaultTimeRange: { from: string; to: string }
): ViewState => ({
  values: Object.fromEntries(
    getViewKeys(document)
      .filter((key) => key in state && state[key] !== document.state[key].default)
      .map((key) => [key, state[key]])
  ),
  ...(flyout === undefined ? {} : { flyout }),
  ...(isEqual(timeRange, defaultTimeRange) ? {} : { timeRange }),
});

export const isSameView = (a: ViewState, b: ViewState): boolean =>
  isEqual(a.values, b.values) && a.flyout === b.flyout && isEqual(a.timeRange, b.timeRange);

/** Nothing to carry: the link of an app as it starts has no view in it. */
export const encodeView = (view: ViewState): string | undefined => {
  if (isSameView(view, EMPTY_VIEW)) return undefined;
  return encode({
    ...(Object.keys(view.values).length > 0 ? { v: view.values } : {}),
    ...(view.flyout === undefined ? {} : { f: view.flyout }),
    ...(view.timeRange === undefined ? {} : { t: view.timeRange }),
  });
};

/** What the time picker writes: date math from now, or a date. Nothing else is tried as a date. */
const TIME_PATTERN = /^(now|\d{4}-\d{2}-\d{2})/;

const isTime = (value: unknown, roundUp: boolean): value is string =>
  typeof value === 'string' &&
  value.length <= MAX_TIME_LENGTH &&
  TIME_PATTERN.test(value) &&
  dateMath.parse(value, { roundUp })?.isValid() === true;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A link is what anyone can type, so it is read as untrusted: whatever is not a value of this app,
 * of its type and size, a flyout of it, or a period that can be parsed, is left out, and a link
 * that cannot be read at all is no view. It never throws.
 */
export const decodeView = (
  document: Pick<AppDocument, 'state' | 'root'>,
  encoded: string | null | undefined
): ViewState => {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) return EMPTY_VIEW;

  let parsed: unknown;
  try {
    parsed = decode(encoded);
  } catch {
    return EMPTY_VIEW;
  }
  if (!isObject(parsed)) return EMPTY_VIEW;

  const keys = new Set(getViewKeys(document));
  const values = Object.fromEntries(
    Object.entries(isObject(parsed.v) ? parsed.v : {}).filter(([key, value]) => {
      const declaration = document.state[key];
      if (!declaration || !keys.has(key) || typeof value !== declaration.type) return false;
      if (typeof value === 'string') return value.length <= MAX_STATE_STRING_LENGTH;
      return typeof value !== 'number' || Number.isFinite(value);
    })
  ) as Record<string, StateValue>;

  const flyoutIds = new Set<string>();
  const pending = [document.root];
  for (let node = pending.pop(); node; node = pending.pop()) {
    if (node.type === 'flyout') flyoutIds.add(node.id);
    pending.push(...getNodeChildren(node));
  }
  const flyout = typeof parsed.f === 'string' && flyoutIds.has(parsed.f) ? parsed.f : undefined;

  const time = isObject(parsed.t) ? parsed.t : undefined;
  const timeRange =
    time && isTime(time.from, false) && isTime(time.to, true)
      ? { from: time.from, to: time.to }
      : undefined;

  return {
    values,
    ...(flyout === undefined ? {} : { flyout }),
    ...(timeRange === undefined ? {} : { timeRange }),
  };
};
