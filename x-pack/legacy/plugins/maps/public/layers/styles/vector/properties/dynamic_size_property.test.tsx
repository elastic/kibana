/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');
jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

// @ts-ignore
import { DynamicSizeProperty } from './dynamic_size_property';
import { StyleMeta } from '../style_meta';
import { FIELD_ORIGIN, VECTOR_STYLES } from '../../../../../common/constants';

const mockField = {
  async getLabel() {
    return 'foobar_label';
  },
  getName() {
    return 'foobar';
  },
  getRootName() {
    return 'foobar';
  },
  getOrigin() {
    return FIELD_ORIGIN.SOURCE;
  },
  supportsFieldMeta() {
    return true;
  },
};

const mockLayer = {
  getDataRequest() {
    return null;
  },
  getStyle() {
    return {
      getStyleMeta() {
        return new StyleMeta({
          geometryTypes: {
            isPointsOnly: true,
            isLinesOnly: false,
            isPolygonsOnly: false,
          },
          fieldMeta: {
            foobar: {
              range: { min: 0, max: 100, delta: 100 },
            },
          },
        });
      },
    };
  },
};

const makeProperty = (options, mockStyle, field = mockField) => {
  return new DynamicSizeProperty(
    options,
    VECTOR_STYLES.ICON_SIZE,
    field,
    // new MockLayer(mockStyle),
    mockLayer,
    () => {
      return x => x + '_format';
    }
  );
};

const defaultLegendParams = {
  isPointsOnly: true,
  isLinesOnly: false,
};

describe('renderLegendDetailRow', () => {
  test('Should render as range', async () => {
    const sizeProp = makeProperty();

    const legendRow = sizeProp.renderLegendDetailRow(defaultLegendParams);

    const component = shallow(legendRow);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
