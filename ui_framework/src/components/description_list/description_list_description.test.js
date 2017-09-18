import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiDescriptionListDescription } from './description_list_description';

describe('KuiDescriptionListDescription', () => {
  test('is rendered', () => {
    const component = render(
      <KuiDescriptionListDescription {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
