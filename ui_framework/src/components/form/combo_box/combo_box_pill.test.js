import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiComboBoxPill } from './combo_box_pill';

describe('KuiComboBoxPill', () => {
  test('is rendered', () => {
    const component = render(
      <KuiComboBoxPill {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
