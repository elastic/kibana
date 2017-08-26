import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLoadingChart } from './loading_chart';

describe('KuiLoadingChart', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLoadingChart {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('mono is rendered', () => {
    const component = render(
      <KuiLoadingChart mono />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
