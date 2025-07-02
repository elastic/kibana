/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SeverityCell } from './severity_cell';

jest.mock('@kbn/ml-anomaly-utils', () => ({
  getFormattedSeverityScore: (score: number) => {
    if (score < 1) return '< 1';
    return Math.round(score).toString();
  },
  useSeverityColor: (score: number) => {
    if (score >= 75) return '#ff0000';
    if (score >= 50) return '#ff9900';
    if (score >= 25) return '#ffcc00';
    if (score >= 3) return '#a6d8ec';
    if (score >= 0) return '#dceef7';
    return '#ffffff';
  },
}));

describe('SeverityCell', () => {
  test('should render a single-bucket marker with rounded severity score', () => {
    const props = {
      score: 75.2,
      isMultiBucketAnomaly: false,
    };
    const { container } = render(<SeverityCell {...props} />);
    expect(container.textContent).toBe('75');
    const svgEl = container.querySelectorAll('[data-euiicon-type]')[0];
    expect(svgEl && svgEl.getAttribute('color')).toBe('#ff0000');
  });

  test('should render a multi-bucket marker with low severity score', () => {
    const props = {
      score: 0.8,
      isMultiBucketAnomaly: true,
    };
    const { container } = render(<SeverityCell {...props} />);
    expect(container.textContent).toBe('< 1');
    const svgEl = container.getElementsByTagName('svg').item(0);
    expect(svgEl && svgEl.getAttribute('fill')).toBe('#dceef7');
  });
});
