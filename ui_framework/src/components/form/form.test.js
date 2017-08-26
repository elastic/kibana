import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiForm } from './form';

describe('KuiForm', () => {
  test('is rendered', () => {
    const component = render(
      <KuiForm {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
