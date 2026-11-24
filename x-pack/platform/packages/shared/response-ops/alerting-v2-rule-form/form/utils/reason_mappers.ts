/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormValues, RuleReason } from '../types';

/**
 * The API only accepts a reason on alert rules and rejects a blank template, so
 * a signal rule or an empty field sends no reason at all.
 */
export const formReasonToApiReason = ({
  kind,
  reason,
}: Pick<FormValues, 'kind' | 'reason'>): RuleReason | undefined =>
  kind === 'alert' && reason?.template.trim() ? { template: reason.template } : undefined;
