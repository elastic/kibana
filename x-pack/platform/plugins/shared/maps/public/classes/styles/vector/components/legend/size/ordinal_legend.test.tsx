/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../../../common/constants';
import type { DynamicSizeProperty } from '../../../properties/dynamic_size_property';
import type { IField } from '../../../../../fields/field';
import { OrdinalLegend } from './ordinal_legend';

const dynamicSizeOptions = {
  minSize: 1,
  maxSize: 10,
  field: {
    name: 'bytes',
    origin: FIELD_ORIGIN.SOURCE,
  },
  fieldMetaOptions: {
    isEnabled: true,
    sigma: 3,
  },
  invert: false,
};

const mockStyle = {
  formatField: (value: number) => {
    return `${value * 0.001}KB`;
  },
  getDisplayStyleName: () => {
    return 'Border width';
  },
  getField: () => {
    return {
      getLabel: () => Promise.resolve('bytes'),
    } as unknown as IField;
  },
  getOptions: () => {
    return dynamicSizeOptions;
  },
  getRangeFieldMeta: () => {
    return {
      min: 0,
      max: 19000,
      delta: 19000,
    };
  },
  getStyleName: () => {
    return VECTOR_STYLES.LINE_WIDTH;
  },
  isFieldMetaEnabled: () => {
    return true;
  },
} as unknown as DynamicSizeProperty;

test('Should render legend', async () => {
  render(
    <I18nProvider>
      <OrdinalLegend style={mockStyle} />
    </I18nProvider>
  );

  // Wait for the async field label to load
  await waitFor(() => {
    expect(screen.getByText('bytes')).toBeInTheDocument();
  });

  // Verify min and max labels are displayed
  expect(screen.getByText('0KB')).toBeInTheDocument();
  expect(screen.getByText('19KB')).toBeInTheDocument();
  
  // Verify that circle icons are rendered with different stroke widths
  const svgElements = document.querySelectorAll('svg');
  expect(svgElements.length).toBe(3); // Should have 3 circle icons
  
  // Check that circles have different stroke-width values
  const firstCircle = svgElements[0];
  const secondCircle = svgElements[1];
  const thirdCircle = svgElements[2];
  
  expect(firstCircle).toHaveStyle('stroke-width: 1px');
  expect(secondCircle).toHaveStyle('stroke-width: 2px');
  expect(thirdCircle).toHaveStyle('stroke-width: 3px');
});
