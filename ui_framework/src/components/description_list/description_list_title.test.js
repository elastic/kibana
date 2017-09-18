import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiDescriptionListTitle } from './description_list_title';

describe('KuiDescriptionListTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiDescriptionListTitle {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
