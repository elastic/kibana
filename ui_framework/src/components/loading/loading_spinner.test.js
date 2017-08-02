import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLoadingSpinner } from './loading_spinner';

describe('KuiLoadingSpinner', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLoadingSpinner {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
