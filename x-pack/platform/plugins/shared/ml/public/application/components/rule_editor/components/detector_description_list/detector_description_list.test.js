/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../anomalies_table/anomaly_value_display', () => ({
  AnomalyValueDisplay: jest.fn().mockImplementation(({ value }) => {
    const React = jest.requireActual('react');
    const displayValue = Array.isArray(value) ? value[0] : value;
    return React.createElement(
      'span',
      { 'data-test-subj': 'mockAnomalyValueDisplay' },
      `${displayValue}`
    );
  }),
}));

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { DetectorDescriptionList } from './detector_description_list';

describe('DetectorDescriptionList', () => {
  test('render for detector with anomaly values', () => {
    const props = {
      job: {
        job_id: 'responsetimes',
      },
      detector: {
        detector_description: 'mean response time',
      },
      anomaly: {
        actual: [50],
        typical: [1.23],
        source: { function: 'mean' },
      },
    };

    const { container } = renderWithI18n(<DetectorDescriptionList {...props} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  test('render for population detector with no anomaly values', () => {
    const props = {
      job: {
        job_id: 'population',
      },
      detector: {
        detector_description: 'count by status over clientip',
      },
      anomaly: {
        source: { function: 'count' },
        causes: [
          {
            actual: [50],
            typical: [1.01],
          },
          {
            actual: [60],
            typical: [1.2],
          },
        ],
      },
    };

    const { container } = renderWithI18n(<DetectorDescriptionList {...props} />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
