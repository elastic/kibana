import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiHorizontalRule } from './horizontal_rule';

describe('KuiHorizontalRule', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHorizontalRule {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
