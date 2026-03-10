/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ExplorerChartInfoTooltip } from './explorer_chart_info_tooltip';

describe('ExplorerChartTooltip', () => {
  test('Render tooltip based on infoTooltip data.', () => {
    const infoTooltip = {
      aggregationInterval: '15m',
      chartFunction: 'avg responsetime',
      entityFields: [
        {
          fieldName: 'airline',
          fieldValue: 'JAL',
        },
      ],
      jobId: 'mock-job-id',
    };

    const { container } = renderWithI18n(<ExplorerChartInfoTooltip {...infoTooltip} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
