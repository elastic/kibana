import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiSwitch } from './switch';

describe('KuiSwitch', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSwitch {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
