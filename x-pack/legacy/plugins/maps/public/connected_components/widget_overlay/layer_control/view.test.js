/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./layer_toc', () => ({
  LayerTOC: () => {
    return <div>mockLayerTOC</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

import { LayerControl } from './view';

const defaultProps = {
  showAddLayerWizard: () => {},
  closeLayerTOC: () => {},
  openLayerTOC: () => {},
  isLayerTOCOpen: true,
  layerList: [],
};

describe('LayerControl', () => {
  test('is rendered', () => {
    const component = shallow(<LayerControl {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  test('isReadOnly', () => {
    const component = shallow(<LayerControl {...defaultProps} isReadOnly={true} />);

    expect(component).toMatchSnapshot();
  });

  describe('isLayerTOCOpen', () => {
    test('Should render expand button', () => {
      const component = shallow(<LayerControl {...defaultProps} isLayerTOCOpen={false} />);

      expect(component).toMatchSnapshot();
    });

    test('Should render expand button with loading icon when layer is loading', () => {
      const mockLayerThatIsLoading = {
        hasErrors: () => {
          return false;
        },
        isLayerLoading: () => {
          return true;
        },
      };
      const component = shallow(
        <LayerControl
          {...defaultProps}
          isLayerTOCOpen={false}
          layerList={[mockLayerThatIsLoading]}
        />
      );

      expect(component).toMatchSnapshot();
    });

    test('Should render expand button with error icon when layer has error', () => {
      const mockLayerThatHasError = {
        hasErrors: () => {
          return true;
        },
        isLayerLoading: () => {
          return false;
        },
      };
      const component = shallow(
        <LayerControl
          {...defaultProps}
          isLayerTOCOpen={false}
          layerList={[mockLayerThatHasError]}
        />
      );

      expect(component).toMatchSnapshot();
    });
  });
});
