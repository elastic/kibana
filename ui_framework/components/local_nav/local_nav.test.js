import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLocalNav } from './local_nav';

test('renders KuiLocalNav', () => {
  const component = <KuiLocalNav { ...requiredProps }>children</KuiLocalNav>;
  expect(render(component)).toMatchSnapshot();
});
