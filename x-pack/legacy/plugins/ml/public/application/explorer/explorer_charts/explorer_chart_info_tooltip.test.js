/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

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

    const wrapper = shallowWithIntl(<ExplorerChartInfoTooltip {...infoTooltip} />);
    expect(wrapper).toMatchSnapshot();
  });
});
