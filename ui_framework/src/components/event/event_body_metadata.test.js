import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEventBodyMetadata,
} from './event_body_metadata';

test('renders KuiEventBodyMetadata', () => {
  const component = <KuiEventBodyMetadata {...requiredProps}>children</KuiEventBodyMetadata>;
  expect(render(component)).toMatchSnapshot();
});
