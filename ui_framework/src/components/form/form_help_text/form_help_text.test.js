import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiFormHelpText } from './form_help_text';

describe('KuiFormHelpText', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFormHelpText {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
