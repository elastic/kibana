import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEvent,
} from './event';

test('renders KuiEvent', () => {
  const component = <KuiEvent {...requiredProps}>children</KuiEvent>;
  expect(render(component)).toMatchSnapshot();
});
