import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiTextArea } from './text_area';

describe('KuiTextArea', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTextArea {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
