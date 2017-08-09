import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormNumber } from './form_number';

describe('KuiFormNumber', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormNumber { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
