/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationSettings } from './types';

/**
 * Whether the anonymization pipeline should run for the given settings. The server (to decide
 * what to mask) and the management page (to render the master switch) must both call this so
 * they can never disagree.
 *
 * Settings saved before the `maskingEnabled` master switch existed have no such key. They keep
 * the behavior they had then: masking is on exactly when at least one rule is enabled.
 */
export const isAnonymizationMaskingEnabled = ({
  maskingEnabled,
  rules,
}: Pick<AnonymizationSettings, 'maskingEnabled' | 'rules'>): boolean =>
  typeof maskingEnabled === 'boolean' ? maskingEnabled : rules.some((rule) => rule.enabled);
