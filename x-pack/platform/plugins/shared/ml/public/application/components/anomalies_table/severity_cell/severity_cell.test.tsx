/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SeverityCell } from './severity_cell';

describe('SeverityCell', () => {
  test('should render a single-bucket marker with rounded severity score', () => {
    const props = {
      score: 75.2,
      isMultiBucketAnomaly: false,
    };
    const { container } = render(<SeverityCell {...props} />);
    expect(container.textContent).toBe('75');
    const svgEl = container.querySelectorAll('[data-euiicon-type]')[0];
    expect(svgEl && svgEl.getAttribute('color')).toBe('#fe5050');
  });

  test('should render a multi-bucket marker with low severity score', () => {
    const props = {
      score: 0.8,
      isMultiBucketAnomaly: true,
    };
    const { container } = render(<SeverityCell {...props} />);
    expect(container.textContent).toBe('< 1');
    const svgEl = container.getElementsByTagName('svg').item(0);
    expect(svgEl && svgEl.getAttribute('fill')).toBe('#d2e9f7');
  });
});
