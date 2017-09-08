import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiComboBoxRow } from './combo_box_row';

describe('KuiComboBoxRow', () => {
  test('is rendered', () => {
    const component = render(
      <KuiComboBoxRow {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
