/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TooltipControl, TOOLTIP_TYPE } from './tooltip_control';

const mockMbMapBounds = {
  west: -180,
  east: 180,
  north: 90,
  south: -90
};
const mockMbMapHandlers = {};
const mockMBMap = {
  project: (lonLatArray) => {
    return {
      x: lonLatArray[0] * 100,
      y: lonLatArray[1] * 100
    };
  },
  on: (eventName, callback) => {
    mockMbMapHandlers[eventName] = callback;
  },
  off: (eventName) => {
    delete mockMbMapHandlers[eventName];
  },
  getBounds: () => {
    return {
      getNorth: () => { return mockMbMapBounds.north; },
      getSouth: () => { return mockMbMapBounds.south; },
      getWest: () => { return mockMbMapBounds.west; },
      getEast: () => { return mockMbMapBounds.east; },
    };
  },
  getLayer: () => {},
  queryRenderedFeatures: () => {},
};

const defaultProps = {
  mbMap: mockMBMap,
  clearTooltipState: () => {},
  setTooltipState: () => {},
  layerList: [],
  isDrawingFilter: false,
  addFilters: () => {},
  geoFields: [{  }],
};

const hoverTooltipState = {
  type: TOOLTIP_TYPE.HOVER,
  location: [-120, 30],
  features: [
    {
      id: 1,
      layerId: 'tfi3f',
      geometry: {},
    }
  ]
};

describe('TooltipControl', () => {

  describe('render', () => {
    describe('tooltipState is not provided', () => {
      test('should not render tooltip popover when tooltipState is not provided', () => {
        const component = shallow(
          <TooltipControl
            {...defaultProps}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });

    describe('tooltipState is provided', () => {
      test('should render tooltip popover with features tooltip content', () => {
        const component = shallow(
          <TooltipControl
            {...defaultProps}
            tooltipState={hoverTooltipState}
          />
        );

        expect(component).toMatchSnapshot();
      });

      test('should render tooltip popover with custom tooltip content when renderTooltipContent provided', () => {
        const component = shallow(
          <TooltipControl
            {...defaultProps}
            tooltipState={hoverTooltipState}
            renderTooltipContent={(props) => {
              return <div {...props}>Custom tooltip content</div>;
            }}
          />
        );

        expect(component).toMatchSnapshot();
      });
    });
  });
});
