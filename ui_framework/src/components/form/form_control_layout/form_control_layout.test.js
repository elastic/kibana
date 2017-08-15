import React from 'react';
import { render } from 'enzyme';

import { KuiFormControlLayout } from './form_control_layout';

describe('KuiFormControlLayout', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormControlLayout>
        <input />
      </KuiFormControlLayout>
    );

    expect(component)
      .toMatchSnapshot();
  });
});
