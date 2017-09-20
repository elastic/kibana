import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFormErrorText } from './form_error_text';

describe('KuiFormErrorText', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormErrorText {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
