/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getChartTooltipDefaultState, mlChartTooltipService } from './chart_tooltip_service';

describe('ML - mlChartTooltipService', () => {
  it('service API duck typing', () => {
    expect(typeof mlChartTooltipService).toBe('object');
    expect(typeof mlChartTooltipService.show).toBe('function');
    expect(typeof mlChartTooltipService.hide).toBe('function');
  });

  it('should fail silently when target is not defined', () => {
    expect(() => {
      mlChartTooltipService.show(getChartTooltipDefaultState().tooltipData, null);
    }).not.toThrow('Call to show() should fail silently.');
  });
});
