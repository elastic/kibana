import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryButton,
} from './gallery_button';

test('renders KuiGalleryButton', () => {
  const component = <KuiGalleryButton { ...requiredProps }>children</KuiGalleryButton>;
  expect(render(component)).toMatchSnapshot();
});
