import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFieldPassword } from './field_password';

describe('KuiFieldPassword', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFieldPassword {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
