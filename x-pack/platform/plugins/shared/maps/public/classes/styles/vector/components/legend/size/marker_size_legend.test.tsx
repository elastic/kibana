/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { FIELD_ORIGIN } from '../../../../../../../common/constants';
import type { DynamicSizeProperty } from '../../../properties/dynamic_size_property';
import type { IField } from '../../../../../fields/field';
import { MarkerSizeLegend } from './marker_size_legend';

const dynamicSizeOptions = {
  minSize: 7,
  maxSize: 32,
  field: {
    name: 'bytes',
    origin: FIELD_ORIGIN.SOURCE,
  },
  fieldMetaOptions: {
    isEnabled: true,
    sigma: 3,
  },
  invert: false,
};

const mockStyle = {
  formatField: (value: number) => {
    return `${value * 0.001}KB`;
  },
  getDisplayStyleName: () => {
    return 'Symbol size';
  },
  getField: () => {
    return {
      getLabel: () => {
        return 'bytes';
      },
    } as unknown as IField;
  },
  getOptions: () => {
    return dynamicSizeOptions;
  },
  getRangeFieldMeta: () => {
    return {
      min: 0,
      max: 19000,
      delta: 19000,
    };
  },
  isFieldMetaEnabled: () => {
    return true;
  },
} as unknown as DynamicSizeProperty;

test('Should render legend', async () => {
  const component = shallow(<MarkerSizeLegend style={mockStyle} />);
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('Should render legend with 3 markers when size difference does not provide enough vertical space for more labels', async () => {
  const component = shallow(
    <MarkerSizeLegend
      style={
        {
          ...mockStyle,
          getOptions: () => {
            return {
              ...dynamicSizeOptions,
              maxSize: 24,
            };
          },
        } as unknown as DynamicSizeProperty
      }
    />
  );
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('Should render legend with 2 markers when size difference does not provide enough vertical space for more labels', async () => {
  const component = shallow(
    <MarkerSizeLegend
      style={
        {
          ...mockStyle,
          getOptions: () => {
            return {
              ...dynamicSizeOptions,
              maxSize: 15,
            };
          },
        } as unknown as DynamicSizeProperty
      }
    />
  );
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('Should render legend with only max marker when size difference does not provide enough vertical space for more labels', async () => {
  const component = shallow(
    <MarkerSizeLegend
      style={
        {
          ...mockStyle,
          getOptions: () => {
            return {
              ...dynamicSizeOptions,
              maxSize: 11,
            };
          },
        } as unknown as DynamicSizeProperty
      }
    />
  );
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('Should render legend without label cutoff when min size is 1', async () => {
  const component = shallow(
    <MarkerSizeLegend
      style={
        {
          ...mockStyle,
          getOptions: () => {
            return {
              ...dynamicSizeOptions,
              minSize: 1,
              maxSize: 7,
            };
          },
        } as unknown as DynamicSizeProperty
      }
    />
  );
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('Should render max label with std clamp notification', async () => {
  const component = shallow(
    <MarkerSizeLegend
      style={
        {
          ...mockStyle,
          getOptions: () => {
            return {
              ...dynamicSizeOptions,
              maxSize: 11,
            };
          },
          getRangeFieldMeta: () => {
            return {
              min: 0,
              max: 16000,
              delta: 16000,
              isMaxOutsideStdRange: true,
            };
          },
        } as unknown as DynamicSizeProperty
      }
    />
  );
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});

test('Should invert legend', async () => {
  const component = shallow(
    <MarkerSizeLegend
      style={
        {
          ...mockStyle,
          getOptions: () => {
            return {
              ...dynamicSizeOptions,
              maxSize: 24,
              invert: true,
            };
          },
        } as unknown as DynamicSizeProperty
      }
    />
  );
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
  expect(component).toMatchSnapshot();
});
