import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageSidebar } from './page_sidebar';

describe('KuiPageSidebar', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageSidebar {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
