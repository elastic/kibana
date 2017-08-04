import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormSelect } from './form_select';

describe('KuiFormSelect', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormSelect { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
