import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiRange } from './range';

describe('KuiRange', () => {
  test('is rendered', () => {
    const component = render(
      <KuiRange {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
