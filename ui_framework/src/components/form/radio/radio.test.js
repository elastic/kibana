import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiRadio } from './radio';

describe('KuiRadio', () => {
  test('is rendered', () => {
    const component = render(
      <KuiRadio { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
