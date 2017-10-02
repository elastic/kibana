import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryItem,
} from './gallery_item';

test('renders KuiGalleryItem href', () => {
  const component = <KuiGalleryItem href="#" {...requiredProps}>children</KuiGalleryItem>;
  expect(render(component)).toMatchSnapshot();
});
