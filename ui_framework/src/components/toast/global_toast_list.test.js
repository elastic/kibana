import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiGlobalToastList } from './global_toast_list';

describe('KuiGlobalToastList', () => {
  test('is rendered', () => {
    const component = render(
      <KuiGlobalToastList {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
