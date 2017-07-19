import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModalHeaderTitle,
} from './modal_header_title';

test('renders KuiModalHeaderTitle', () => {
  const component = <KuiModalHeaderTitle { ...requiredProps }>children</KuiModalHeaderTitle>;
  expect(render(component)).toMatchSnapshot();
});
