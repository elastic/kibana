import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEventSymbol,
} from './event_symbol';

test('renders KuiEventSymbol', () => {
  const component = <KuiEventSymbol {...requiredProps}>children</KuiEventSymbol>;
  expect(render(component)).toMatchSnapshot();
});
