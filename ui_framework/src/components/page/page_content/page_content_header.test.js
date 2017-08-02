import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageContentHeader } from './page_content_header';

describe('KuiPageContentHeader', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageContentHeader {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
