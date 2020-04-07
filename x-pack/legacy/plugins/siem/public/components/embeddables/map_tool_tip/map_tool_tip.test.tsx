/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { MapToolTipComponent } from './map_tool_tip';
import { MapFeature } from '../types';

describe('MapToolTip', () => {
  test('placeholder component renders correctly', () => {
    const wrapper = shallow(<MapToolTipComponent />);
    expect(wrapper.find('EuiLoadingSpinner')).toHaveLength(1);
  });

  test('full component renders correctly', () => {
    const closeTooltip = jest.fn();
    const features: MapFeature[] = [
      {
        id: 1,
        layerId: 'layerId',
      },
    ];
    const getLayerName = jest.fn();
    const loadFeatureProperties = jest.fn();
    const loadFeatureGeometry = jest.fn();

    const wrapper = shallow(
      <MapToolTipComponent
        closeTooltip={closeTooltip}
        features={features}
        getLayerName={getLayerName}
        loadFeatureProperties={loadFeatureProperties}
        loadFeatureGeometry={loadFeatureGeometry}
      />
    );
    expect(wrapper.find('EuiLoadingSpinner')).toHaveLength(1);
  });
});
