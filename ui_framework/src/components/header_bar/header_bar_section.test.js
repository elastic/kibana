import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiHeaderBarSection
} from './header_bar_section';

test('renders KuiHeaderBarSection', () => {
  const component = <KuiHeaderBarSection {...requiredProps}>children</KuiHeaderBarSection>;
  expect(render(component)).toMatchSnapshot();
});
