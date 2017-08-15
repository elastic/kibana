import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFormRow } from './form_row';

describe('KuiFormRow', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormRow {...requiredProps}>
        <input />
      </KuiFormRow>
    );

    expect(component)
      .toMatchSnapshot();
  });
});
