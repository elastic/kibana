import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormRange } from './form_range';

describe('KuiFormRange', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormRange { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
