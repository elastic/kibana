/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import { getSeverityStatusColor } from './get_vulnerability_colors';
describe('getSeverityStatusColor', () => {
  it('should return the correct color for LOW severity', () => {
    expect(getSeverityStatusColor('LOW')).toBe(euiThemeVars.euiColorVis0);
  });

  it('should return the correct color for MEDIUM severity', () => {
    expect(getSeverityStatusColor('MEDIUM')).toBe(euiThemeVars.euiColorVis5_behindText);
  });

  it('should return the correct color for HIGH severity', () => {
    expect(getSeverityStatusColor('HIGH')).toBe(euiThemeVars.euiColorVis9_behindText);
  });

  it('should return the correct color for CRITICAL severity', () => {
    expect(getSeverityStatusColor('CRITICAL')).toBe(euiThemeVars.euiColorDanger);
  });

  it('should return #aaa for an unknown severity', () => {
    expect(getSeverityStatusColor('UNKNOWN')).toBe('#aaa');
  });
});
