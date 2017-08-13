import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFormControlLayout } from './form_control_layout';

describe('KuiFormControlLayout', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormControlLayout {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
