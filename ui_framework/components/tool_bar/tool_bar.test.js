import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiToolBar,
} from './tool_bar';

test('renders KuiToolBar', () => {
  const component = <KuiToolBar { ...requiredProps }>children</KuiToolBar>;
  expect(render(component)).toMatchSnapshot();
});

