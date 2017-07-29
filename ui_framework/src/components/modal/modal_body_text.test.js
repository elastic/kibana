import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModalBodyText,
} from './modal_body_text';

test('renders KuiModalBodyText', () => {
  const component = <KuiModalBodyText { ...requiredProps }>children</KuiModalBodyText>;
  expect(render(component)).toMatchSnapshot();
});
