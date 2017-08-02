import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiPage } from './page';

describe('KuiPage', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPage {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
