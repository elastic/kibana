import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiKeyPadMenu } from './key_pad_menu';

describe('KuiKeyPadMenu', () => {
  test('is rendered', () => {
    const component = render(
      <KuiKeyPadMenu {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
