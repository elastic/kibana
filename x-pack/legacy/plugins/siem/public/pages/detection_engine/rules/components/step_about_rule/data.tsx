/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHealth } from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import * as I18n from './translations';

export type SeverityValue = 'low' | 'medium' | 'high' | 'critical';

interface SeverityOptionItem {
  value: SeverityValue;
  inputDisplay: React.ReactElement;
}

export const severityOptions: SeverityOptionItem[] = [
  {
    value: 'low',
    inputDisplay: <EuiHealth color={euiLightVars.euiColorVis0}>{I18n.LOW}</EuiHealth>,
  },
  {
    value: 'medium',
    inputDisplay: <EuiHealth color={euiLightVars.euiColorVis5}>{I18n.MEDIUM} </EuiHealth>,
  },
  {
    value: 'high',
    inputDisplay: <EuiHealth color={euiLightVars.euiColorVis7}>{I18n.HIGH} </EuiHealth>,
  },
  {
    value: 'critical',
    inputDisplay: <EuiHealth color={euiLightVars.euiColorVis9}>{I18n.CRITICAL} </EuiHealth>,
  },
];

export const defaultRiskScoreBySeverity: Record<SeverityValue, number> = {
  low: 21,
  medium: 47,
  high: 73,
  critical: 99,
};
