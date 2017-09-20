import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageContentBody } from './page_content_body';

describe('KuiPageContentBody', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageContentBody {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
