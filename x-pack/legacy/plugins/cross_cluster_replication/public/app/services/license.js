/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let isAvailable;
export let isActive;
export let getReason;

export function setLicense(isAvailableCallback, isActiveCallback, getReasonCallback) {
  isAvailable = isAvailableCallback;
  isActive = isActiveCallback;
  getReason = getReasonCallback;
}
