import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiCode } from './code';

describe('KuiCode', () => {
  test('is rendered', () => {
    const component = render(
      <KuiCode {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
