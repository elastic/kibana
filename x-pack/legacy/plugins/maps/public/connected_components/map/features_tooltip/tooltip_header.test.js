/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TooltipHeader } from './tooltip_header';

class MockLayer {
  constructor(id) {
    this._id = id;
  }
  async getDisplayName() {
    return `display + ${this._id}`;
  }
  getId() {
    return this._id;
  }
}

const defaultProps = {
  onClose: () => {},
  isLocked: false,
  findLayerById: id => {
    return new MockLayer(id);
  },
  setCurrentFeature: () => {},
};

describe('TooltipHeader', () => {
  describe('single feature:', () => {
    const SINGLE_FEATURE = [
      {
        id: 'feature1',
        layerId: 'layer1',
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should not render header', async () => {
        const component = shallow(<TooltipHeader {...defaultProps} features={SINGLE_FEATURE} />);

        // Ensure all promises resolve
        await new Promise(resolve => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
    describe('locked', () => {
      test('should show close button when locked', async () => {
        const component = shallow(
          <TooltipHeader {...defaultProps} isLocked={true} features={SINGLE_FEATURE} />
        );

        // Ensure all promises resolve
        await new Promise(resolve => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
  });

  describe('multiple features, single layer:', () => {
    const MULTI_FEATURES_SINGE_LAYER = [
      {
        id: 'feature1',
        layerId: 'layer1',
      },
      {
        id: 'feature2',
        layerId: 'layer1',
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should only show features count', async () => {
        const component = shallow(
          <TooltipHeader {...defaultProps} features={MULTI_FEATURES_SINGE_LAYER} />
        );

        // Ensure all promises resolve
        await new Promise(resolve => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
    describe('locked', () => {
      test('should show pagination controls, features count, and close button', async () => {
        const component = shallow(
          <TooltipHeader {...defaultProps} isLocked={true} features={MULTI_FEATURES_SINGE_LAYER} />
        );

        // Ensure all promises resolve
        await new Promise(resolve => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
  });

  describe('multiple features, multiple layers:', () => {
    const MULTI_FEATURES_MULTI_LAYERS = [
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
      },
    ];
    describe('mouseover (unlocked)', () => {
      test('should only show features count', async () => {
        const component = shallow(
          <TooltipHeader {...defaultProps} features={MULTI_FEATURES_MULTI_LAYERS} />
        );

        // Ensure all promises resolve
        await new Promise(resolve => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
    describe('locked', () => {
      test('should show pagination controls, features count, layer select, and close button', async () => {
        const component = shallow(
          <TooltipHeader {...defaultProps} isLocked={true} features={MULTI_FEATURES_MULTI_LAYERS} />
        );

        // Ensure all promises resolve
        await new Promise(resolve => process.nextTick(resolve));
        // Ensure the state changes are reflected
        component.update();

        expect(component).toMatchSnapshot();
      });
    });
  });
});
