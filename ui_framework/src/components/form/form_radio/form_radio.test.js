import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormRadio } from './form_radio';

describe('KuiFormRadio', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormRadio { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
