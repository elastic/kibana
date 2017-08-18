import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryButtonLabel,
} from './gallery_button_label';

test('renders KuiGalleryButtonLabel', () => {
  const component = <KuiGalleryButtonLabel {...requiredProps}>children</KuiGalleryButtonLabel>;
  expect(render(component)).toMatchSnapshot();
});
