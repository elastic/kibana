/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getThemeResolvedSeverityColor } from '@kbn/ml-anomaly-utils';
import { getSelectedIntervalColor } from './get_selected_interval_color';

const euiTheme = {
  colors: {
    severity: {
      danger: 'red',
      risk: 'orange',
      warning: 'yellow',
      neutral: 'blue',
      unknown: 'grey',
    },
  },
} as unknown as EuiThemeComputed;
const colorOf = (score: number) => getThemeResolvedSeverityColor(score, euiTheme);

const config = (points: Array<[number, number | undefined]> = []) => ({
  jobId: 'job',
  chartData: points.map(([date, anomalyScore]) => ({ date: new Date(date), anomalyScore })),
  entityFields: [{ fieldName: 'event.action', fieldValue: 'deleteUser' }],
  selectedEarliest: 100,
  selectedLatest: 200,
});
const anomaly = (time: number, severity: number, entityValue = 'deleteUser', jobId = 'job') => ({
  jobId,
  severity,
  entityName: 'event.action',
  entityValue,
  source: { timestamp: time },
});

describe('getSelectedIntervalColor', () => {
  it('is the colour of the highest score of the chart points in the selected range', () => {
    expect(
      getSelectedIntervalColor(
        config([
          [120, 10],
          [150, 80],
          [180, undefined],
          [50, 99],
        ]),
        [],
        euiTheme
      )
    ).toBe(colorOf(80));
  });

  it('uses the anomalies of the table when the chart points have no scores', () => {
    expect(getSelectedIntervalColor(config(), [anomaly(150, 98)], euiTheme)).toBe(colorOf(98));
  });

  it('uses the highest of the chart points and the table', () => {
    expect(getSelectedIntervalColor(config([[120, 30]]), [anomaly(150, 98)], euiTheme)).toBe(
      colorOf(98)
    );
  });

  it('differs between charts of different entities', () => {
    const anomalies = [anomaly(150, 98), anomaly(150, 0.5, 'createUser')];
    const create = {
      ...config(),
      entityFields: [{ fieldName: 'event.action', fieldValue: 'createUser' }],
    };
    expect(getSelectedIntervalColor(config(), anomalies, euiTheme)).toBe(colorOf(98));
    expect(getSelectedIntervalColor(create, anomalies, euiTheme)).toBe(colorOf(0.5));
  });

  it('ignores anomalies of other jobs or outside the selected range', () => {
    expect(
      getSelectedIntervalColor(
        config(),
        [anomaly(150, 98, 'deleteUser', 'other'), anomaly(500, 98)],
        euiTheme
      )
    ).toBeUndefined();
  });

  it('is undefined without a score in the range', () => {
    expect(getSelectedIntervalColor(config([[50, 99]]), undefined, euiTheme)).toBeUndefined();
  });
});
