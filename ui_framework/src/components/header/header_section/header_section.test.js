import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderSection } from './header_section';

describe('KuiHeaderSection', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderSection {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('side', () => {
    test('defaults to left', () => {
      const component = render(
        <KuiHeaderSection />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('renders right', () => {
      const component = render(
        <KuiHeaderSection side="right" />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
