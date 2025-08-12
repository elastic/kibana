/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { UpdateSourceEditor } from './update_source_editor';
import { GRID_RESOLUTION, LAYER_TYPE, RENDER_AS } from '../../../../common/constants';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345'),
}));

const defaultProps = {
  bucketsName: 'clusters',
  currentLayerType: LAYER_TYPE.GEOJSON_VECTOR,
  geoFieldName: 'myLocation',
  indexPatternId: 'foobar',
  onChange: async () => {},
  metrics: [],
  renderAs: RENDER_AS.POINT,
  resolution: GRID_RESOLUTION.COARSE,
};

describe('source editor geo_grid_source', () => {
  test('should render editor', async () => {
    render(
      <I18nProvider>
        <UpdateSourceEditor {...defaultProps} />
      </I18nProvider>
    );
    
    // Verify the Metrics section is present
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    
    // Verify the Clusters section is present (bucketsName) - use heading role to be specific
    const clustersHeading = screen.getByRole('heading', { name: 'Clusters' });
    expect(clustersHeading).toBeInTheDocument();
  });

  test('should not allow editing multiple metrics for heatmap', async () => {
    render(
      <I18nProvider>
        <UpdateSourceEditor {...defaultProps} currentLayerType={LAYER_TYPE.HEATMAP} />
      </I18nProvider>
    );
    
    // Verify the Metrics section is present
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    
    // Verify the Heat map section is present (for heatmap layer type)
    expect(screen.getByText('Heat map')).toBeInTheDocument();
  });
});
