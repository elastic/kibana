import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiButton } from './button';

describe('KuiButton', () => {
  test('is rendered', () => {
    const component = render(
      <KuiButton {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
