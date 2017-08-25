import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTableHeaderCellCheckbox } from './table_header_cell_checkbox';

describe('KuiTableHeaderCellCheckbox', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTableHeaderCellCheckbox {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
