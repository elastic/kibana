import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModalBody,
} from './modal_body';

test('renders KuiModalBody', () => {
  const component = <KuiModalBody { ...requiredProps }>children</KuiModalBody>;
  expect(render(component)).toMatchSnapshot();
});
