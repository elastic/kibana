import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableHeaderCell,
} from './table_header_cell';

import {
  RIGHT_ALIGNMENT,
} from '../../services';

test('renders KuiTableHeaderCell', () => {
  const component = (
    <KuiTableHeaderCell {...requiredProps}>
      children
    </KuiTableHeaderCell>
  );

  expect(render(component)).toMatchSnapshot();
});

describe('align', () => {
  test('defaults to left', () => {
    const component = (
      <KuiTableHeaderCell />
    );

    expect(render(component)).toMatchSnapshot();
  });

  test('renders right when specified', () => {
    const component = (
      <KuiTableHeaderCell align={RIGHT_ALIGNMENT} />
    );

    expect(render(component)).toMatchSnapshot();
  });
});
