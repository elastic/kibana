/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutTemplateProps } from '@kbn/flyout-template';

export type ObservableFlyoutProperties = Omit<FlyoutTemplateProps, 'children' | 'onClose'>;

/**
 * The history group of the observable flyout and its tools. A tool opens as a new session with this
 * key, so the flyout menu shows Back to the observable.
 */
export const OBSERVABLE_FLYOUT_HISTORY_KEY = Symbol('casesObservableFlyout');

// 24 × the EUI base size, the minimum width of the Security flyout v2 panels.
const FLYOUT_MIN_WIDTH = 384;

/** The main panel, with the defaults of the Security flyout v2 main panels. */
export const OBSERVABLE_FLYOUT_PROPERTIES: ObservableFlyoutProperties = {
  session: 'start',
  historyKey: OBSERVABLE_FLYOUT_HISTORY_KEY,
  type: 'overlay',
  size: 's',
  ownFocus: false,
  resizable: true,
  minWidth: FLYOUT_MIN_WIDTH,
  'data-test-subj': 'cases-observable-flyout',
};

/** A tool panel: a wider panel in the same history group. */
export const OBSERVABLE_TOOL_FLYOUT_PROPERTIES: ObservableFlyoutProperties = {
  ...OBSERVABLE_FLYOUT_PROPERTIES,
  size: 'm',
  'data-test-subj': 'cases-observable-cases-tool',
};

export const OBSERVABLE_CASES_PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Query parameters of a link to an observable: the case view opens its flyout from them. */
export const OBSERVABLE_LINK_PARAMS = {
  typeKey: 'observableTypeKey',
  value: 'observableValue',
} as const;
