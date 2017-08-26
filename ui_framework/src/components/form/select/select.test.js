import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiSelect } from './select';

describe('KuiSelect', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSelect {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
