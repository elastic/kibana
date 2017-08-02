import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageContentHeaderSection } from './page_content_header_section';

describe('KuiPageContentHeaderSection', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageContentHeaderSection {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
