import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiPageContent } from './page_content';

describe('KuiPageContent', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPageContent {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
