import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderBreadcrumbs } from './header_breadcrumbs';

describe('KuiHeaderBreadcrumbs', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderBreadcrumbs {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
