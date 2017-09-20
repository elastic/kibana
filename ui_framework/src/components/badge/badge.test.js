import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiBadge } from './badge';

describe('KuiBadge', () => {
  test('is rendered', () => {
    const component = render(
      <KuiBadge {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
