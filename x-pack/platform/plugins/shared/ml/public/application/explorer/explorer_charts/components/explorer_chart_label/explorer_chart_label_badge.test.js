/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import seriesConfig from '../../__mocks__/mock_series_config_filebeat.json';

import React from 'react';
import { render } from '@testing-library/react';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';

describe('ExplorerChartLabelBadge', () => {
  test('renders entity label badge', () => {
    const { container } = render(<ExplorerChartLabelBadge entity={seriesConfig.entityFields[0]} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
