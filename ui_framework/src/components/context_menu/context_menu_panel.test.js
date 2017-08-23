import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiContextMenuPanel } from './context_menu_panel';

describe('KuiContextMenuPanel', () => {
  test('is rendered', () => {
    const component = render(
      <KuiContextMenuPanel {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
