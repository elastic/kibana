import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiProgress } from './progress';

describe('KuiProgress', () => {
  test('is rendered', () => {
    const component = render(
      <KuiProgress {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
