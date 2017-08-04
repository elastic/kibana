import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormTextarea } from './form_textarea';

describe('KuiFormTextarea', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormTextarea { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
