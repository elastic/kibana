import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiShiftNav } from './shift_nav';

describe('KuiShiftNav', () => {
  test('is rendered', () => {
    const component = render(
      <KuiShiftNav {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
