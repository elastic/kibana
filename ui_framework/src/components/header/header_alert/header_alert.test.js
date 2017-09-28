import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderAlert } from './header_alert';

describe('KuiHeaderAlert', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderAlert {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
