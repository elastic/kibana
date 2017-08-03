import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiControlledTable,
} from './controlled_table';

test('renders KuiToolControlledTable', () => {
  const component = <KuiControlledTable {...requiredProps}>children</KuiControlledTable>;
  expect(render(component)).toMatchSnapshot();
});
