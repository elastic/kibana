import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiHeaderLogo } from './header_logo';

describe('KuiHeaderLogo', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderLogo {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('renders href', () => {
    const component = render(
      <KuiHeaderLogo href="#" />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
