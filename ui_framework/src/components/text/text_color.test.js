import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTextColor } from './text_color';

describe('KuiTextColor', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTextColor {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
