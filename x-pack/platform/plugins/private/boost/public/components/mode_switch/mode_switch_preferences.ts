/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostMode } from '../../../common/types';

const MODES: readonly BoostMode[] = ['simple', 'advanced'];

// Kept per browser, unlike the boost settings, since it's one person's preference.
const getStorageKey = (mode: BoostMode) => `boost:skipModeSwitchConfirmation:${mode}`;

/** Whether switching to a mode skips confirming what changes. */
export const isModeSwitchConfirmationSkipped = (mode: BoostMode): boolean =>
  localStorage.getItem(getStorageKey(mode)) === 'true';

/** Stops confirming what changes when switching to a mode. */
export const skipModeSwitchConfirmation = (mode: BoostMode): void =>
  localStorage.setItem(getStorageKey(mode), 'true');

/** Confirms what changes when switching to either mode again. */
export const resetModeSwitchConfirmations = (): void =>
  MODES.forEach((mode) => localStorage.removeItem(getStorageKey(mode)));
