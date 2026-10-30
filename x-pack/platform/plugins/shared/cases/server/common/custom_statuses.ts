/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

let customStatusesEnabled = false;

/**
 * Set once at plugin setup from `xpack.cases.customStatuses.enabled`. Write paths far from the
 * plugin config (case create/update, push, workflows) read it here.
 */
export const setCustomStatusesEnabled = (enabled: boolean): void => {
  customStatusesEnabled = enabled;
};

/** Whether spaces can define their own case statuses and cases can be set to them. */
export const isCustomStatusesEnabled = (): boolean => customStatusesEnabled;

export const CUSTOM_STATUSES_DISABLED_MESSAGE = 'Custom statuses are turned off.';

/** Rejects a request that sets `status_key` while the feature is off. */
export const throwIfStatusKeyWhileDisabled = (statusKey: string | null | undefined): void => {
  if (statusKey != null && !customStatusesEnabled) {
    throw Boom.badRequest(CUSTOM_STATUSES_DISABLED_MESSAGE);
  }
};

/**
 * The `status_key` to add to a case read. Always present while custom statuses are on; while they
 * are off, only a key stored earlier passes through, so responses match those before the field
 * existed.
 */
export const getStatusKeyField = (
  statusKey: string | null | undefined
): { status_key?: string | null } =>
  isCustomStatusesEnabled() || statusKey != null ? { status_key: statusKey ?? null } : {};
