import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPanel } from './panel';

describe('KuiPanel', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPanel {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
