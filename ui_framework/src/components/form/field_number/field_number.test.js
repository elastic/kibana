import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFieldNumber } from './field_number';

describe('KuiFieldNumber', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFieldNumber {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
