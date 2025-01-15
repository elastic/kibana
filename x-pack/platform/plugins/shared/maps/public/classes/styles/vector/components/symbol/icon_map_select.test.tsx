/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

jest.mock('./icon_stops', () => ({
  IconStops: () => {
    return <div>mockIconStops</div>;
  },
}));

jest.mock('../../symbol_utils', () => {
  return {
    getIconPaletteOptions: () => {
      return [
        { value: 'filledShapes', inputDisplay: <div>mock filledShapes option</div> },
        { value: 'hollowShapes', inputDisplay: <div>mock hollowShapes option</div> },
      ];
    },
    PREFERRED_ICONS: ['circle'],
  };
});

import React from 'react';
import { shallow } from 'enzyme';

import { FIELD_ORIGIN } from '../../../../../../common/constants';
import { AbstractField } from '../../../../fields/field';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';
import { IconDynamicOptions } from '../../../../../../common/descriptor_types';
import { IconMapSelect } from './icon_map_select';

class MockField extends AbstractField {}

class MockDynamicStyleProperty {
  getField() {
    return new MockField({ fieldName: 'myField', origin: FIELD_ORIGIN.SOURCE });
  }

  getValueSuggestions() {
    return [];
  }
}

const defaultProps = {
  iconPaletteId: 'filledShapes',
  onChange: () => {},
  styleProperty:
    new MockDynamicStyleProperty() as unknown as IDynamicStyleProperty<IconDynamicOptions>,
  isCustomOnly: false,
  customIconStops: [
    {
      stop: null,
      icon: 'circle',
      svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg version="1.1" id="circle-15" xmlns="http://www.w3.org/2000/svg" width="15px" height="15px" viewBox="0 0 15 15">\n  <path d="M14,7.5c0,3.5899-2.9101,6.5-6.5,6.5S1,11.0899,1,7.5S3.9101,1,7.5,1S14,3.9101,14,7.5z"/>\n</svg>',
    },
  ],
  customIcons: [],
  onCustomIconsChange: () => {},
};

test('Should render default props', () => {
  const component = shallow(<IconMapSelect {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

test('Should render custom stops input when useCustomIconMap', () => {
  const component = shallow(
    <IconMapSelect
      {...defaultProps}
      useCustomIconMap={true}
      customIconStops={[
        {
          stop: null,
          icon: 'circle',
        },
        {
          stop: 'value1',
          icon: 'marker',
        },
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});

test('Should render icon map select with custom icons', () => {
  const component = shallow(
    <IconMapSelect
      {...defaultProps}
      customIcons={[
        {
          symbolId: '__kbn__custom_icon_sdf__foobar',
          label: 'My Custom Icon',
          svg: '<svg width="200" height="250" xmlns="http://www.w3.org/2000/svg"><path stroke="#000" fill="transparent" stroke-width="5" d="M10 10h30v30H10z"/></svg>',
          cutoff: 0.25,
          radius: 0.25,
        },
        {
          symbolId: '__kbn__custom_icon_sdf__bizzbuzz',
          label: 'My Other Custom Icon',
          svg: '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="531.74" height="460.5" overflow="visible" xml:space="preserve"><path stroke="#000" d="M.866 460 265.87 1l265.004 459z"/></svg>',
          cutoff: 0.3,
          radius: 0.15,
        },
      ]}
      customIconStops={[
        {
          stop: null,
          icon: '__kbn__custom_icon_sdf__bizzbuzz',
        },
        {
          stop: 'value1',
          icon: 'marker',
        },
      ]}
    />
  );

  expect(component).toMatchSnapshot();
});

test('Should not render icon map select when isCustomOnly', () => {
  const component = shallow(<IconMapSelect {...defaultProps} isCustomOnly={true} />);

  expect(component).toMatchSnapshot();
});
