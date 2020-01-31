/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { FieldTypeIcon } from './field_type_icon';
import { ML_JOB_FIELD_TYPES } from '../../../common/constants/field_types';

describe('FieldTypeIcon', () => {
  test(`don't render component when type is undefined`, () => {
    const typeIconComponent = shallow(<FieldTypeIcon />);
    expect(typeIconComponent.isEmptyRender()).toBeTruthy();
  });

  test(`don't render component when type doesn't match a field type`, () => {
    const typeIconComponent = shallow(<FieldTypeIcon type="foo" />);
    expect(typeIconComponent.isEmptyRender()).toBeTruthy();
  });

  test(`render component when type matches a field type`, () => {
    const typeIconComponent = shallow(<FieldTypeIcon type={ML_JOB_FIELD_TYPES.KEYWORD} />);
    expect(typeIconComponent).toMatchSnapshot();
  });

  test(`render with tooltip and test hovering`, () => {
    const typeIconComponent = mount(
      <FieldTypeIcon type={ML_JOB_FIELD_TYPES.KEYWORD} tooltipEnabled={true} />
    );
    const container = typeIconComponent.find({ className: 'field-type-icon-container' });

    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(1);

    container.simulate('mouseover');
    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(2);

    container.simulate('mouseout');
    expect(typeIconComponent.find('EuiToolTip').children()).toHaveLength(1);
  });

  test(`update component`, () => {
    const typeIconComponent = shallow(<FieldTypeIcon />);
    expect(typeIconComponent.isEmptyRender()).toBeTruthy();
    typeIconComponent.setProps({ type: ML_JOB_FIELD_TYPES.IP });
    expect(typeIconComponent).toMatchSnapshot();
  });
});
