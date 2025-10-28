/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import type { LayerDescriptor } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
import type { ISource } from '../../../classes/sources/source';
import { AttributionFormRow } from './attribution_form_row';

const defaultProps = {
  onChange: () => {},
};

test('Should render null when layer source has attribution provider', () => {
  const sourceMock = {
    getAttributionProvider: () => {
      return async () => {
        return [{ url: 'url1', label: 'label1' }];
      };
    },
  } as unknown as ISource;
  const layerMock = {
    getSource: () => {
      return sourceMock;
    },
  } as unknown as ILayer;
  const component = shallow(<AttributionFormRow {...defaultProps} layer={layerMock} />);

  expect(component).toMatchSnapshot();
});

test('Should render add form row when attribution not provided', () => {
  const sourceMock = {
    getAttributionProvider: () => {
      return null;
    },
  } as unknown as ISource;
  const layerMock = {
    getSource: () => {
      return sourceMock;
    },
    getDescriptor: () => {
      return {} as unknown as LayerDescriptor;
    },
  } as unknown as ILayer;
  const component = shallow(<AttributionFormRow {...defaultProps} layer={layerMock} />);

  expect(component).toMatchSnapshot();
});

test('Should render edit form row when attribution not provided', () => {
  const sourceMock = {
    getAttributionProvider: () => {
      return null;
    },
  } as unknown as ISource;
  const layerMock = {
    getSource: () => {
      return sourceMock;
    },
    getDescriptor: () => {
      return {
        attribution: {
          url: 'url1',
          label: 'label1',
        },
      } as unknown as LayerDescriptor;
    },
  } as unknown as ILayer;
  const component = shallow(<AttributionFormRow {...defaultProps} layer={layerMock} />);

  expect(component).toMatchSnapshot();
});
