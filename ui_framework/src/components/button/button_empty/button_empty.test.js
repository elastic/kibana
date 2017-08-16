import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiButtonEmpty } from './button_empty';

describe('KuiButtonEmpty', () => {
  test('is rendered', () => {
    const component = render(
      <KuiButtonEmpty {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
