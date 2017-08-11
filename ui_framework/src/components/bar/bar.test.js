import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiBar,
} from './bar';

test('renders KuiBar', () => {
  const component = <KuiBar {...requiredProps}>children</KuiBar>;
  expect(render(component)).toMatchSnapshot();
});
