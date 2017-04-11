import React from 'react';
import { render } from 'enzyme';
import { commonHtmlProps } from '../../test/common_html_props';

import {
  KuiToolBarFooter,
} from './tool_bar_footer';

test('renders KuiToolBarFooter', () => {
  const component = <KuiToolBarFooter { ...commonHtmlProps }>children</KuiToolBarFooter>;
  expect(render(component)).toMatchSnapshot();
});
