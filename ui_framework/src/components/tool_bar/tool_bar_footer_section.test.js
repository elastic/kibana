import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiToolBarFooterSection,
} from './tool_bar_footer_section';

test('renders KuiToolBarFooterSection', () => {
  const component = <KuiToolBarFooterSection {...requiredProps}>children</KuiToolBarFooterSection>;
  expect(render(component)).toMatchSnapshot();
});
