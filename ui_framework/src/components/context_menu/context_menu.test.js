import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiContextMenu } from './shift_nav';

describe('KuiContextMenu', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenu {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
