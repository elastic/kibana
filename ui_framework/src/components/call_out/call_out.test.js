import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiCallOut } from './call_out';

describe('KuiCallOut', () => {
  test('is rendered', () => {
    const component = render(
      <KuiCallOut {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
