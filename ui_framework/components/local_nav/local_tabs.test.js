import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLocalTabs } from './local_tabs';

test('renders KuiLocalTabs', () => {
  const component = <KuiLocalTabs { ...requiredProps }>children</KuiLocalTabs>;
  expect(render(component)).toMatchSnapshot();
});
