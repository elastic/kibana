import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiButtonOption } from './button_option';

describe('KuiButtonOption', () => {
  test('is rendered', () => {
    const component = render(
      <KuiButtonOption {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
