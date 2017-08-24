import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPagination } from './pagination';

describe('KuiPagination', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPagination
        onPageClick={() => {}}
        {...requiredProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
