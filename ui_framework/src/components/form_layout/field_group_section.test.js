import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiFieldGroupSection,
} from './field_group_section';

test('renders KuiFieldGroupSection', () => {
  const component = <KuiFieldGroupSection {...requiredProps}>children</KuiFieldGroupSection>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiFieldGroupSection isWide', () => {
  const component = <KuiFieldGroupSection isWide {...requiredProps}>children</KuiFieldGroupSection>;
  expect(render(component)).toMatchSnapshot();
});
