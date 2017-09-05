import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiAccordion } from './accordion';

describe('KuiAccordion', () => {
  test('is rendered', () => {
    const component = render(
      <KuiAccordion {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
