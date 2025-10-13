/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LensMapsProvider, useLensMaps } from './lens_maps_context';
import type { DatasourceMap, VisualizationMap, Visualization, Datasource } from './types';

describe('LensMapsContext', () => {
  const mockVisualizationMap: VisualizationMap = {
    testViz: {} as Visualization,
  };

  const mockDatasourceMap: DatasourceMap = {
    testDatasource: {} as Datasource,
  };

  function TestComponent() {
    const { visualizationMap, datasourceMap } = useLensMaps();
    return (
      <div>
        <span data-test-subj="viz-count">{Object.keys(visualizationMap).length}</span>
        <span data-test-subj="ds-count">{Object.keys(datasourceMap).length}</span>
      </div>
    );
  }

  it('provides visualizationMap and datasourceMap to children', () => {
    render(
      <LensMapsProvider visualizationMap={mockVisualizationMap} datasourceMap={mockDatasourceMap}>
        <TestComponent />
      </LensMapsProvider>
    );

    expect(screen.getByTestId('viz-count')).toHaveTextContent('1');
    expect(screen.getByTestId('ds-count')).toHaveTextContent('1');
  });

  it('throws error when useLensMaps is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLensMaps must be used within a LensMapsProvider');

    consoleError.mockRestore();
  });
});
