import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiContextMenuItem } from './context_menu_item';

describe('KuiContextMenuItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenuItem {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
