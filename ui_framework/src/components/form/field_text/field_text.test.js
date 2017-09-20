import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFieldText } from './field_text';

describe('KuiFieldText', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFieldText {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
