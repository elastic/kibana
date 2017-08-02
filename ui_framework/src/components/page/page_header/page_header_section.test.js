import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageHeaderSection } from './page_header_section';

describe('KuiPageHeaderSection', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageHeaderSection {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
