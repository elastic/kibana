import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormPassword } from './form_password';

describe('KuiFormPassword', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormPassword { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
