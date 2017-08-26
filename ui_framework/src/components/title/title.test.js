import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTitle } from './title';

describe('KuiTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTitle {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
