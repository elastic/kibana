/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHealth } from '@elastic/eui';

import { type FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { ML_SEVERITY_COLORS } from '@kbn/ml-anomaly-utils';

import { ALERT_ANOMALY_SCORE } from '../../../common/constants/alerts';

import { getAlertFormatters } from './render_cell_value';

describe('getAlertFormatters', () => {
  const fieldFormatsMock = fieldFormatsServiceMock.createStartContract();

  const alertFormatter = getAlertFormatters(fieldFormatsMock as FieldFormatsRegistry);

  test('format anomaly score correctly', () => {
    expect(alertFormatter(ALERT_ANOMALY_SCORE, 50.3)).toEqual(
      <EuiHealth color={ML_SEVERITY_COLORS.MAJOR} textSize="xs">
        50
      </EuiHealth>
    );

    expect(alertFormatter(ALERT_ANOMALY_SCORE, '50.3,89.6')).toEqual(
      <EuiHealth color={ML_SEVERITY_COLORS.CRITICAL} textSize="xs">
        89
      </EuiHealth>
    );

    expect(alertFormatter(ALERT_ANOMALY_SCORE, '0.7')).toEqual(
      <EuiHealth color={ML_SEVERITY_COLORS.LOW} textSize="xs">
        &lt; 1
      </EuiHealth>
    );

    expect(alertFormatter(ALERT_ANOMALY_SCORE, '0')).toEqual(
      <EuiHealth color={ML_SEVERITY_COLORS.LOW} textSize="xs">
        &lt; 1
      </EuiHealth>
    );

    expect(alertFormatter(ALERT_ANOMALY_SCORE, '')).toEqual(
      <EuiHealth color={ML_SEVERITY_COLORS.LOW} textSize="xs">
        &lt; 1
      </EuiHealth>
    );
  });
});
