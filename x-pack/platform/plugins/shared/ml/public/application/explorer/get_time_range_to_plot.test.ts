/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDate } from '@elastic/eui';
import moment from 'moment';
import { SWIMLANE_TYPE } from '@kbn/ml-common-types/embeddables/swimlane_type';
import { getTimeRangeToPlot } from './get_time_range_to_plot';
import type { AppStateSelectedCells } from './explorer_utils';

const DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const globalTimeRange = {
  from: '2016-02-07T00:00:00.000Z',
  to: '2016-02-11T23:59:54.000Z',
};

const selectedCells: AppStateSelectedCells = {
  type: SWIMLANE_TYPE.OVERALL,
  lanes: ['Overall'],
  times: [1486656000, 1486670400],
};

const bounds = {
  min: moment(1486656000000),
  max: moment(1486670399999),
};

describe('getTimeRangeToPlot', () => {
  it('uses plot earliest/latest when both are finite numbers', () => {
    const plotEarliest = 1486659600000;
    const plotLatest = 1486663200000;

    expect(
      getTimeRangeToPlot({
        seriesToPlot: [{ plotEarliest, plotLatest }],
        selectedCells,
        bounds,
        interval: 3600,
        globalTimeRange,
      })
    ).toEqual({
      from: formatDate(plotEarliest, DATE_FORMAT),
      to: formatDate(plotLatest, DATE_FORMAT),
    });
  });

  it('falls back to the selected swimlane range when plot times are missing', () => {
    expect(
      getTimeRangeToPlot({
        seriesToPlot: [{}],
        selectedCells,
        bounds,
        interval: 3600,
        globalTimeRange,
      })
    ).toEqual({
      from: formatDate(selectedCells.times[0] * 1000, DATE_FORMAT),
      to: formatDate(selectedCells.times[1] * 1000 - 1, DATE_FORMAT),
      mode: 'absolute',
    });
  });

  it('falls back to the global time range when plot times and a selection are missing', () => {
    expect(
      getTimeRangeToPlot({
        seriesToPlot: [{}],
        globalTimeRange,
      })
    ).toEqual(globalTimeRange);
  });
});
