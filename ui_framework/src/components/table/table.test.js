import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTable } from './table';
import { KuiTableRow } from './table_row';
import { KuiTableRowCell } from './table_row_cell';
import { KuiTableBody } from './table_body';
import { KuiTableHeader } from './table_header';
import { KuiTableHeaderCell } from './table_header_cell';

test('renders KuiTable', () => {
  const component = (
    <KuiTable {...requiredProps}>
      <KuiTableHeader>
        <KuiTableHeaderCell>
          Hi Title
        </KuiTableHeaderCell>
        <KuiTableHeaderCell>
          Bye Title
        </KuiTableHeaderCell>
      </KuiTableHeader>
      <KuiTableBody>
        <KuiTableRow>
          <KuiTableRowCell>Hi</KuiTableRowCell>
        </KuiTableRow>
        <KuiTableRow>
          <KuiTableRowCell>Bye</KuiTableRowCell>
        </KuiTableRow>
      </KuiTableBody>
    </KuiTable>
  );
  expect(render(component)).toMatchSnapshot();
});
