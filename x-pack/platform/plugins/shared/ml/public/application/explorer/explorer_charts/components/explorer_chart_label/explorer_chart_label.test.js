/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import seriesConfig from '../../__mocks__/mock_series_config_filebeat.json';

import React from 'react';
import { render } from '@testing-library/react';

import { ExplorerChartLabel } from './explorer_chart_label';

const DetectorLabel = <React.Fragment>{seriesConfig.detectorLabel}</React.Fragment>;

describe('ExplorerChartLabelBadge', () => {
  test('renders the chart label in one line', () => {
    const { container } = render(
      <ExplorerChartLabel
        detectorLabel={DetectorLabel}
        entityFields={seriesConfig.entityFields}
        infoTooltip={seriesConfig.infoTooltip}
        wrapLabel={false}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  test('renders the chart label in two lines', () => {
    const { container } = render(
      <ExplorerChartLabel
        detectorLabel={DetectorLabel}
        entityFields={seriesConfig.entityFields}
        infoTooltip={seriesConfig.infoTooltip}
        wrapLabel
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
