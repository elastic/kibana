import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageBody } from './page_body';

describe('KuiPageBody', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageBody {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
