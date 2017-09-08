import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiComboBox } from './combo_box';

describe('KuiComboBox', () => {
  test('is rendered', () => {
    const component = render(
      <KuiComboBox {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
