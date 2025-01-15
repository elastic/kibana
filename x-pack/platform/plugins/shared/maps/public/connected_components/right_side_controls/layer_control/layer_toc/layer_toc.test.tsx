/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./toc_entry', () => ({
  TOCEntry: () => {
    return <div>mockTOCEntry</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';
import { ILayer } from '../../../../classes/layers/layer';

import { LayerTOC } from './layer_toc';

const mockLayers = [
  {
    getId: () => {
      return '1';
    },
    getParent: () => {
      return undefined;
    },
    supportsFitToBounds: () => {
      return true;
    },
  } as unknown as ILayer,
  {
    getId: () => {
      return '2';
    },
    getParent: () => {
      return undefined;
    },
    supportsFitToBounds: () => {
      return false;
    },
  } as unknown as ILayer,
];

const defaultProps = {
  layerList: mockLayers,
  isReadOnly: false,
  openTOCDetails: [],
  moveLayerToBottom: () => {},
  moveLayerToLeftOfTarget: () => {},
  setLayerParent: () => {},
  createLayerGroup: () => {},
};

describe('LayerTOC', () => {
  test('is rendered', () => {
    const component = shallow(<LayerTOC {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('isReadOnly', () => {
      const component = shallow(<LayerTOC {...defaultProps} isReadOnly={true} />);

      expect(component).toMatchSnapshot();
    });
  });
});
