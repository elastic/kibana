import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiAccordian } from './accordian';

describe('KuiAccordian', () => {
  test('is rendered', () => {
    const component = render(
      <KuiAccordian {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
