/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { FeatureTooltip } from './feature_tooltip';

class MockLayer {
  constructor(id) {
    this._id = id;
  }
  async getDisplayName() {
    return `display + ${this._id}`;
  }
}

const MULTI_FEATURE_MULTI_LAYER = [
  {
    id: 'feature1',
    layerId: 'layer1',
  },
  {
    id: 'feature2',
    layerId: 'layer1',
  },
  {
    id: 'feature1',
    layerId: 'layer2',
  }
];

const SINGLE_FEATURE = [
  {
    id: 'feature1',
    layerId: 'layer1',
  }
];

const defaultProps = {
  loadFeatureProperties: () => { return []; },
  loadFeatureGeometry: () => {
    return {
      type: 'Point',
      coordinates: [102.0, 0.5]
    };
  },
  findLayerById: (id) => {
    return new MockLayer(id);
  },
  closeTooltip: () => {},
  showFilterButtons: false,
  isLocked: false,
};

describe('FeatureTooltip (single)', () => {

  test('should not show close button', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        features={SINGLE_FEATURE}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show close button', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        isLocked={true}
        features={SINGLE_FEATURE}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });
});

describe('FeatureTooltip (multi)', () => {

  test('should not show close button / should show count', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        features={MULTI_FEATURE_MULTI_LAYER}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show close button / should show count', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        isLocked={true}
        features={MULTI_FEATURE_MULTI_LAYER}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should show close button / should show count / should show arrows / should show layer filter', async () => {
    const component = shallow(
      <FeatureTooltip
        {...defaultProps}
        isLocked={true}
        features={MULTI_FEATURE_MULTI_LAYER}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });
});
