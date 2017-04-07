import React from 'react';
import { render } from 'enzyme';
import { commonHtmlProps } from '../../test/common_html_props';

import {
  KuiToolBar,
  KuiToolBarFooter,
} from './tool_bar';

test('renders KuiToolBar', () => {
  const component = <KuiToolBar { ...commonHtmlProps }>children</KuiToolBar>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiToolBarFooter', () => {
  const component = <KuiToolBarFooter { ...commonHtmlProps }>children</KuiToolBarFooter>;
  expect(render(component)).toMatchSnapshot();
});
