/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as I18n from './translations';

export type SeverityValue = 'low' | 'medium' | 'high' | 'critical';

interface SeverityOptionItem {
  value: SeverityValue;
  text: string;
}

export const severityOptions: SeverityOptionItem[] = [
  { value: 'low', text: I18n.LOW },
  { value: 'medium', text: I18n.MEDIUM },
  { value: 'high', text: I18n.HIGH },
  { value: 'critical', text: I18n.CRITICAL },
];

export const defaultRiskScoreBySeverity: Record<SeverityValue, number> = {
  low: 21,
  medium: 47,
  high: 73,
  critical: 99,
};
