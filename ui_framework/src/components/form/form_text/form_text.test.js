import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormText } from './form_text';

describe('KuiFormText', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormText { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
