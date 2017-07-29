import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModalHeader,
} from './modal_header';

test('renders KuiModalHeader', () => {
  const component = <KuiModalHeader { ...requiredProps }>children</KuiModalHeader>;
  expect(render(component)).toMatchSnapshot();
});
