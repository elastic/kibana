/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { LayerTocActions } from './layer_toc_actions';

let supportsFitToBounds;
const layerMock = {
  supportsFitToBounds: () => {
    return supportsFitToBounds;
  },
  isVisible: () => {
    return true;
  },
  getIconAndTooltipContent: (zoom, isUsingSearch) => {
    return {
      icon: <span>mockIcon</span>,
      tooltipContent: `simulated tooltip content at zoom: ${zoom}`,
      footnotes: [
        {
          icon: <span>mockFootnoteIcon</span>,
          message: `simulated footnote at isUsingSearch: ${isUsingSearch}`,
        },
      ],
    };
  },
};

const defaultProps = {
  displayName: 'layer 1',
  escapedDisplayName: 'layer1',
  zoom: 0,
  layer: layerMock,
  isUsingSearch: true,
};

describe('LayerTocActions', () => {
  beforeEach(() => {
    supportsFitToBounds = true;
  });

  test('is rendered', async () => {
    const component = shallowWithIntl(<LayerTocActions {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should not show edit actions in read only mode', async () => {
    const component = shallowWithIntl(<LayerTocActions {...defaultProps} isReadOnly={true} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should disable fit to data when supportsFitToBounds is false', async () => {
    supportsFitToBounds = false;
    const component = shallowWithIntl(<LayerTocActions {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
