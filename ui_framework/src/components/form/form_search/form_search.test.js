import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFormSearch } from './form_search';

describe('KuiFormSearch', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormSearch { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
