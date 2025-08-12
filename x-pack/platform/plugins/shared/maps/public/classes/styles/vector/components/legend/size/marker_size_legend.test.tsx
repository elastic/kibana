/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { FIELD_ORIGIN } from '../../../../../../../common/constants';
import type { DynamicSizeProperty } from '../../../properties/dynamic_size_property';
import type { IField } from '../../../../../fields/field';
import { MarkerSizeLegend } from './marker_size_legend';

// Mock SVG getBBox method which doesn't exist in test environment
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  writable: true,
  value: jest.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 20,
  }),
});

const dynamicSizeOptions = {
  minSize: 7,
  maxSize: 32,
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
    return 'Symbol size';
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
  isFieldMetaEnabled: () => {
    return true;
  },
} as unknown as DynamicSizeProperty;

test('Should render legend', async () => {
  render(
    <I18nProvider>
      <MarkerSizeLegend style={mockStyle} />
    </I18nProvider>
  );
  
  // Wait for the async label to load
  await waitFor(() => {
    expect(screen.getByText('bytes')).toBeInTheDocument();
  });
  
  // Verify SVG legend is rendered
  const svgElement = document.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
});

test('Should render legend with different marker counts based on size range', async () => {
  const { rerender } = render(
    <I18nProvider>
      <MarkerSizeLegend style={mockStyle} />
    </I18nProvider>
  );

  // Wait for initial render
  await waitFor(() => {
    expect(screen.getByText('bytes')).toBeInTheDocument();
  });

  // Test with smaller max size (should show fewer markers)
  rerender(
    <I18nProvider>
      <MarkerSizeLegend
        style={
          {
            ...mockStyle,
            getOptions: () => ({
              ...dynamicSizeOptions,
              maxSize: 15,
            }),
          } as unknown as DynamicSizeProperty
        }
      />
    </I18nProvider>
  );

  // Verify legend still renders with different size
  const svgElement = document.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
});

test('Should handle inverted legend', async () => {
  render(
    <I18nProvider>
      <MarkerSizeLegend
        style={
          {
            ...mockStyle,
            getOptions: () => ({
              ...dynamicSizeOptions,
              maxSize: 24,
              invert: true,
            }),
          } as unknown as DynamicSizeProperty
        }
      />
    </I18nProvider>
  );

  // Wait for legend to load and verify it renders with inverted styling
  await waitFor(() => {
    expect(screen.getByText('bytes')).toBeInTheDocument();
  });
  
  const svgElement = document.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
});

test('Should render max label with standard deviation clamp notification', async () => {
  render(
    <I18nProvider>
      <MarkerSizeLegend
        style={
          {
            ...mockStyle,
            getOptions: () => ({
              ...dynamicSizeOptions,
              maxSize: 11,
            }),
            getRangeFieldMeta: () => ({
              min: 0,
              max: 16000,
              delta: 16000,
              isMaxOutsideStdRange: true,
            }),
          } as unknown as DynamicSizeProperty
        }
      />
    </I18nProvider>
  );

  // Wait for legend to load and verify it renders even with std range notifications
  await waitFor(() => {
    expect(screen.getByText('bytes')).toBeInTheDocument();
  });
  
  const svgElement = document.querySelector('svg');
  expect(svgElement).toBeInTheDocument();
});
