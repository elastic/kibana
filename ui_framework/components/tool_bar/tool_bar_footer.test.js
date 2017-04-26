import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiToolBarFooter,
} from './tool_bar_footer';

test('renders KuiToolBarFooter', () => {
  const component = <KuiToolBarFooter { ...requiredProps }>children</KuiToolBarFooter>;
  expect(render(component)).toMatchSnapshot();
});
