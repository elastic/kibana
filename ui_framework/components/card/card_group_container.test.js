import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCardGroupContainer,
} from './card_group_container';

test('renders KuiCardGroupContainer', () => {
  const component = <KuiCardGroupContainer { ...requiredProps }>children</KuiCardGroupContainer>;
  expect(render(component)).toMatchSnapshot();
});
