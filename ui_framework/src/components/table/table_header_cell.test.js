import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableHeaderCell,
} from './table_header_cell';

test('renders KuiTableHeaderCell', () => {
  const component = <KuiTableHeaderCell {...requiredProps}>children</KuiTableHeaderCell>;
  expect(render(component)).toMatchSnapshot();
});
