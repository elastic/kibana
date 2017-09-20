import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFieldSearch } from './field_search';

describe('KuiFieldSearch', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFieldSearch {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
