import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFlexItem } from './flex_item';

describe('KuiFlexItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFlexItem {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
