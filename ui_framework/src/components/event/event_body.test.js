import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEventBody,
} from './event_body';

test('renders KuiEventBody', () => {
  const component = <KuiEventBody {...requiredProps}>children</KuiEventBody>;
  expect(render(component)).toMatchSnapshot();
});
