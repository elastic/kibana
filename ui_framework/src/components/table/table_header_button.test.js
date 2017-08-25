import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiTableHeaderButton } from './table_header_button';

describe('KuiTableHeaderButton', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTableHeaderButton {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
