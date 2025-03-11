/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Header } from './header';
import { IVectorLayer } from '../../../../classes/layers/vector_layer';

const layerMock = {
  getDisplayName: async () => {
    return 'myLayerName';
  },
  getLayerIcon: () => {
    return {
      icon: <span>mockIcon</span>,
    };
  },
} as unknown as IVectorLayer;

const defaultProps = {
  findLayerById: (layerId: string) => {
    return layerMock;
  },
  isLocked: false,
  layerId: 'myLayerId',
  onClose: () => {
    return;
  },
};

test('render', async () => {
  const component = shallow(<Header {...defaultProps} />);

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

test('isLocked', async () => {
  const component = shallow(<Header {...defaultProps} isLocked={true} />);

  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();

  expect(component).toMatchSnapshot();
});

// Test is sync to show render before async state is set.
test('should only show close button when layer name is not yet loaded', () => {
  const component = shallow(<Header {...defaultProps} isLocked={true} />);
  expect(component).toMatchSnapshot();
});
