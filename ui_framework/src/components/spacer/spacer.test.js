import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiSpacer } from './spacer';

describe('KuiSpacer', () => {
  test('is rendered', () => {
    const component = render(
      <KuiSpacer {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
