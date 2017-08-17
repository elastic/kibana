import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableHeaderCheckBoxCell,
} from './table_header_check_box_cell';

test('renders KuiTableHeaderCheckBoxCell', () => {
  const component = <KuiTableHeaderCheckBoxCell {...requiredProps}>children</KuiTableHeaderCheckBoxCell>;
  expect(render(component)).toMatchSnapshot();
});
