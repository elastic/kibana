import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTableRowCellCheckbox } from './table_row_cell_checkbox';

describe('KuiTableRowCellCheckbox', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTableRowCellCheckbox {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
