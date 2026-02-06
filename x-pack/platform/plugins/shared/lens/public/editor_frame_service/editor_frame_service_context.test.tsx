/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditorFrameServiceProvider, useEditorFrameService } from './editor_frame_service_context';
import type { DatasourceMap, VisualizationMap, Visualization, Datasource } from '@kbn/lens-common';

describe('EditorFrameServiceContext', () => {
  const mockVisualizationMap: VisualizationMap = {
    testViz: {} as Visualization,
  };

  const mockDatasourceMap: DatasourceMap = {
    formBased: {} as Datasource,
  };

  function TestComponent() {
    const { visualizationMap, datasourceMap } = useEditorFrameService();
    return (
      <div>
        <span data-test-subj="viz-count">{Object.keys(visualizationMap).length}</span>
        <span data-test-subj="ds-count">{Object.keys(datasourceMap).length}</span>
      </div>
    );
  }

  it('provides visualizationMap and datasourceMap to children', () => {
    render(
      <EditorFrameServiceProvider
        visualizationMap={mockVisualizationMap}
        datasourceMap={mockDatasourceMap}
      >
        <TestComponent />
      </EditorFrameServiceProvider>
    );

    expect(screen.getByTestId('viz-count')).toHaveTextContent('1');
    expect(screen.getByTestId('ds-count')).toHaveTextContent('1');
  });

  it('throws error when useEditorFrameService is used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useEditorFrameService must be used within an EditorFrameServiceProvider');

    consoleError.mockRestore();
  });
});
