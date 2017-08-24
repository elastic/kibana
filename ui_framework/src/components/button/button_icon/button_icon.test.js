import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiButtonIcon } from './button_icon';

describe('KuiButtonIcon', () => {
  test('is rendered', () => {
    const component = render(
      <KuiButtonIcon {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
