import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormCheckbox } from './form_checkbox';

describe('KuiFormCheckbox', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormCheckbox { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
