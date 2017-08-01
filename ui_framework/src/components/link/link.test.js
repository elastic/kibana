import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLink } from './link';

describe('KuiLink', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLink
        href="#"
        target="_blank"
        {...requiredProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
