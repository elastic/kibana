import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTable } from './table';
import { KuiTableRow } from './table_row';
import { KuiTableRowCell } from './table_row_cell';

test('renders KuiTable', () => {
  const component = (
    <KuiTable { ...requiredProps }>
      <KuiTableRow>
        <KuiTableRowCell>Hi</KuiTableRowCell>
      </KuiTableRow>
      <KuiTableRow>
        <KuiTableRowCell>Bye</KuiTableRowCell>
      </KuiTableRow>
    </KuiTable>
  );
  expect(render(component)).toMatchSnapshot();
});
