import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiSideNavTitle } from './side_nav_title';

describe('KuiSideNavTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSideNavTitle {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
