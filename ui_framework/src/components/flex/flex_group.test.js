import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFlexGroup } from './flex_group';

describe('KuiFlexGroup', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFlexGroup {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
