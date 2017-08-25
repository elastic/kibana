import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiCheckbox } from './checkbox';

describe('KuiCheckbox', () => {
  test('is rendered', () => {
    const component = render(
      <KuiCheckbox onChange={() => {}} {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
