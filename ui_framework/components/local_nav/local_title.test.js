import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLocalTitle } from './local_title';

test('renders KuiLocalTitle', () => {
  const component = <KuiLocalTitle { ...requiredProps }>children</KuiLocalTitle>;
  expect(render(component)).toMatchSnapshot();
});
