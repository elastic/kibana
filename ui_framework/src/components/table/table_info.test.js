import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTableInfo,
} from './table_info';

test('renders KuiTableInfo', () => {
  const component = <KuiTableInfo {...requiredProps}>children</KuiTableInfo>;
  expect(render(component)).toMatchSnapshot();
});
