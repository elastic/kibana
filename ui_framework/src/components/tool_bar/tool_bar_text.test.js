import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiToolBarText,
} from './tool_bar_text';

test('renders KuiToolBarText', () => {
  const component = <KuiToolBarText {...requiredProps}>children</KuiToolBarText>;
  expect(render(component)).toMatchSnapshot();
});

