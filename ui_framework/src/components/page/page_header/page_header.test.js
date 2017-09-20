import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageHeader } from './page_header';

describe('KuiPageHeader', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageHeader {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
