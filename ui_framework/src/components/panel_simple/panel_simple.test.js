import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPanelSimple } from './panel_simple';

describe('KuiPanelSimple', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPanelSimple {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
