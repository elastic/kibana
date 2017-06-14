import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableRowCellLiner,
} from './table_row_cell_liner';

test('renders KuiTableRowCellLiner', () => {
  const component = <KuiTableRowCellLiner { ...requiredProps }>children</KuiTableRowCellLiner>;
  expect(render(component)).toMatchSnapshot();
});
