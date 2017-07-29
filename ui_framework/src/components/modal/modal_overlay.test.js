import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModalOverlay,
} from './modal_overlay';

test('renders KuiModalOverlay', () => {
  const component = <KuiModalOverlay { ...requiredProps }>children</KuiModalOverlay>;
  expect(render(component)).toMatchSnapshot();
});
