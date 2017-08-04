import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormSwitch } from './form_switch';

describe('KuiFormSwitch', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormSwitch { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
