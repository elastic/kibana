import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiBottomBar } from './bottom_bar';

describe('KuiBottomBar', () => {
  test('is rendered', () => {
    const component = render(
      <KuiBottomBar {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
