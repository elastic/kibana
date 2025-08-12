/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../kibana_services', () => ({
  getDocLinks: () => ({
    links: {
      elasticsearch: {
        dynamicIndexSettings: 'https://example.com/docs',
      },
    },
  }),
}));

jest.mock('./load_index_settings', () => ({
  loadIndexSettings: async () => {
    return { maxInnerResultWindow: 100, maxResultWindow: 10000 };
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { ScalingForm } from './scaling_form';
import { SCALING_TYPES } from '../../../../../common/constants';

const defaultProps = {
  filterByMapBounds: true,
  indexPatternId: 'myIndexPattern',
  onChange: () => {},
  scalingType: SCALING_TYPES.LIMIT,
  supportsClustering: true,
  termFields: [],
  numberOfJoins: 0,
  hasSpatialJoins: false,
};

describe('scaling form', () => {
  test('should render', async () => {
    render(
      <I18nProvider>
        <ScalingForm {...defaultProps} />
      </I18nProvider>
    );

    // Verify the Scaling title is present
    expect(screen.getByText('Scaling')).toBeInTheDocument();
    
    // Verify the radio button options are present
    expect(screen.getByText('Use vector tiles')).toBeInTheDocument();
    expect(screen.getByText('Show clusters when results exceed 10,000')).toBeInTheDocument();
    expect(screen.getByText('Limit results to 10,000')).toBeInTheDocument();
    
    // Verify the filter switch is present
    expect(screen.getByText('Dynamically filter for data in the visible map area')).toBeInTheDocument();
  });

  test('should disable clusters option when clustering is not supported', async () => {
    render(
      <I18nProvider>
        <ScalingForm
          {...defaultProps}
          supportsClustering={false}
          clusteringDisabledReason="Simulated clustering disabled"
        />
      </I18nProvider>
    );

    // Verify the Scaling title is present
    expect(screen.getByText('Scaling')).toBeInTheDocument();
    
    // Verify the clusters radio button is disabled
    const clustersRadio = screen.getByLabelText('Show clusters when results exceed 10,000');
    expect(clustersRadio).toBeDisabled();
    
    // Verify other radio buttons are still enabled
    const vectorTilesRadio = screen.getByLabelText('Use vector tiles');
    expect(vectorTilesRadio).toBeEnabled();
    
    const limitRadio = screen.getByLabelText('Limit results to 10,000');
    expect(limitRadio).toBeEnabled();
  });
});
