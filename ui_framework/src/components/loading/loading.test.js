import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLoading } from './loading';

describe('KuiLoading', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLoading { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
