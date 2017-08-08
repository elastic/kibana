import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageSideBar } from './page_side_bar';

describe('KuiPageSideBar', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageSideBar {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
