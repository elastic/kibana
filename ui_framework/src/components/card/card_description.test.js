import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCardDescription,
} from './card_description';

test('renders KuiCardDescription', () => {
  const component = <KuiCardDescription {...requiredProps}>children</KuiCardDescription>;
  expect(render(component)).toMatchSnapshot();
});
