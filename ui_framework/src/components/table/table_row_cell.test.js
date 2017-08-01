import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableRowCell,
} from './table_row_cell';

import {
  RIGHT_ALIGNMENT,
} from '../../services';

test('renders KuiTableRowCell', () => {
  const component = (
    <KuiTableRowCell {...requiredProps}>
      children
    </KuiTableRowCell>
  );

  expect(render(component)).toMatchSnapshot();
});

describe('align', () => {
  test('defaults to left', () => {
    const component = (
      <KuiTableRowCell />
    );

    expect(render(component)).toMatchSnapshot();
  });

  test('renders right when specified', () => {
    const component = (
      <KuiTableRowCell align={RIGHT_ALIGNMENT} />
    );

    expect(render(component)).toMatchSnapshot();
  });
});

describe('wrapText', () => {
  test('is rendered when specified', () => {
    const component = (
      <KuiTableRowCell wrapText={true} />
    );

    expect(render(component)).toMatchSnapshot();
  });
});
