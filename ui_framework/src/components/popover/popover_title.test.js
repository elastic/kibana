import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPopoverTitle } from './popover_title';

describe('KuiPopoverTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPopoverTitle {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
