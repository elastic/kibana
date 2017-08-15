import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFormLabel } from './form_label';

describe('KuiFormLabel', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormLabel {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
