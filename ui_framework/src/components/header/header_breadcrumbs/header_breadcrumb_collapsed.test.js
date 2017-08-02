import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderBreadcrumbCollapsed } from './header_breadcrumb_collapsed';

describe('KuiHeaderBreadcrumbCollapsed', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderBreadcrumbCollapsed {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
