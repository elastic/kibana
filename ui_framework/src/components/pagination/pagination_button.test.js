import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPaginationButton } from './pagination_button';

describe('KuiPaginationButton', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPaginationButton {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
