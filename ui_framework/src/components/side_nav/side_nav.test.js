import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiSideNav } from './side_nav';

describe('KuiSideNav', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSideNav {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('isOpenOnMobile', () => {
    test('defaults to false', () => {
      const component = render(
        <KuiSideNav />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('is rendered when specified as true', () => {
      const component = render(
        <KuiSideNav isOpenOnMobile />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
