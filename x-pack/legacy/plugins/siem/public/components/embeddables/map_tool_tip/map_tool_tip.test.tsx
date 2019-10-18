/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { MapToolTip } from './map_tool_tip';
import { MapFeature } from '../types';

jest.mock('../../search_bar', () => ({
  siemFilterManager: {
    addFilters: jest.fn(),
  },
}));

describe('MapToolTip', () => {
  test('placeholder component renders correctly against snapshot', () => {
    const wrapper = shallow(<MapToolTip />);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('full component renders correctly against snapshot', () => {
    const addFilters = jest.fn();
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
      <MapToolTip
        addFilters={addFilters}
        closeTooltip={closeTooltip}
        features={features}
        isLocked={false}
        getLayerName={getLayerName}
        loadFeatureProperties={loadFeatureProperties}
        loadFeatureGeometry={loadFeatureGeometry}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
