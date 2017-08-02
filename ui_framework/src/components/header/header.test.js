import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiHeader } from './header';

describe('KuiHeader', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeader {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
