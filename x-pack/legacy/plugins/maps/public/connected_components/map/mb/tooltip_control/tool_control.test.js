/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import React from 'react';
import { mount, shallow } from 'enzyme';
import { TooltipControl, TOOLTIP_TYPE } from './tooltip_control';

const layerId = 'tfi3f';
const mbLayerId = 'tfi3f_circle';
const mockLayer = {
  getMbLayerIds: () => { return [mbLayerId]; },
  getId: () => { return layerId; },
  canShowTooltip: () => { return true; },
};
let featuresAtLocation = [];
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
  queryRenderedFeatures: () => { return featuresAtLocation; },
};

const defaultProps = {
  mbMap: mockMBMap,
  clearTooltipState: () => {},
  setTooltipState: () => {},
  layerList: [mockLayer],
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
      layerId: layerId,
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

  describe('onClick', () => {
    const mockMapMouseEvent = {
      point: { x: 0, y: 0 },
      lngLat: { lng: 0, lat: 0 },
    };
    const setTooltipStateStub = sinon.stub();
    const clearTooltipStateStub = sinon.stub();

    beforeEach(() => {
      setTooltipStateStub.reset();
      clearTooltipStateStub.reset();
    });

    test('should ignore clicks when map is in drawing mode', () => {
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          setTooltipState={setTooltipStateStub}
          isDrawingFilter={true}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(clearTooltipStateStub);
      sinon.assert.notCalled(setTooltipStateStub);
    });

    test('should clear tooltip state when there are no features at clicked location', () => {
      featuresAtLocation = [];
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          setTooltipState={setTooltipStateStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.calledOnce(clearTooltipStateStub);
      sinon.assert.notCalled(setTooltipStateStub);
    });

    test('should set tooltip state when there are features at clicked location', () => {
      featuresAtLocation = [
        {
          geometry: {
            type: 'Point',
            coordinates: [ 100, 30 ]
          },
          layer: {
            id: mbLayerId
          },
          properties: {
            __kbn__feature_id__: 1
          }
        }
      ];
      mount(
        <TooltipControl
          {...defaultProps}
          clearTooltipState={clearTooltipStateStub}
          setTooltipState={setTooltipStateStub}
        />
      );

      mockMbMapHandlers.click(mockMapMouseEvent);

      sinon.assert.notCalled(clearTooltipStateStub);
      sinon.assert.calledWith(setTooltipStateStub, {
        features: [{ geometry: { coordinates: [100, 30], type: 'Point' }, id: 1, layerId: 'tfi3f' }],
        location: [100, 30],
        type: 'LOCKED'
      });
    });
  });
});
