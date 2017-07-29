import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModalFooter,
} from './modal_footer';

test('renders KuiModalFooter', () => {
  const component = <KuiModalFooter { ...requiredProps }>children</KuiModalFooter>;
  expect(render(component)).toMatchSnapshot();
});
