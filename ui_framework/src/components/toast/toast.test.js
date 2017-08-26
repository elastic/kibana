import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiToast } from './toast';

describe('KuiToast', () => {
  test('is rendered', () => {
    const component = render(
      <KuiToast {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
