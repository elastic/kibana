import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiSideNavItem } from './side_nav_item';

describe('KuiSideNavItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSideNavItem { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
