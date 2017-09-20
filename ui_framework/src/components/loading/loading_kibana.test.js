import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLoadingKibana } from './loading_kibana';

describe('KuiLoadingKibana', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLoadingKibana {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
