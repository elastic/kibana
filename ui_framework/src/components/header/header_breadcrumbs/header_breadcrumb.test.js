import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderBreadcrumb } from './header_breadcrumb';

describe('KuiHeaderBreadcrumb', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderBreadcrumb {...requiredProps}>
        content
      </KuiHeaderBreadcrumb>
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('href is rendered', () => {
    const component = render(
      <KuiHeaderBreadcrumb href="#" />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('isActive is rendered', () => {
    const component = render(
      <KuiHeaderBreadcrumb isActive={true} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
