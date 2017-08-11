import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLocalNavRowSection } from './local_nav_row_section';

test('renders KuiLocalNavRowSection', () => {
  const component = <KuiLocalNavRowSection { ...requiredProps }>children</KuiLocalNavRowSection>;
  expect(render(component)).toMatchSnapshot();
});
