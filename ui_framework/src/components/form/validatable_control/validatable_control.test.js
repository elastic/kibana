import React from 'react';
import { render } from 'enzyme';

import { KuiValidatableControl } from './validatable_control';

describe('KuiValidatableControl', () => {
  test('is rendered', () => {
    const component = render(
      <KuiValidatableControl>
        <input />
      </KuiValidatableControl>
    );

    expect(component)
      .toMatchSnapshot();
  });
});
