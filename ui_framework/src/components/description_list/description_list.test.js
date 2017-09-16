import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiDescriptionList } from './description_list';

describe('KuiDescriptionList', () => {
  test('is rendered', () => {
    const component = render(
      <KuiDescriptionList {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
