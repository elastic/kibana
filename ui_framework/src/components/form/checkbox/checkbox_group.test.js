import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiCheckboxGroup } from './checkbox_group';

describe('KuiCheckboxGroup', () => {
  test('is rendered', () => {
    const component = render(
      <KuiCheckboxGroup onChange={() => {}} {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
