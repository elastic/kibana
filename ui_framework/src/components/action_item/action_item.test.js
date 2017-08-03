import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiActionItem,
} from './action_item';

test('renders KuiActionItem', () => {
  const component = <KuiActionItem {...requiredProps}>children</KuiActionItem>;
  expect(render(component)).toMatchSnapshot();
});
