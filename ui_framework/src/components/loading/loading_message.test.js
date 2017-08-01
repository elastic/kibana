import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiLoadingMessage } from './loading_message';

describe('KuiLoadingMessage', () => {
  test('is rendered', () => {
    const component = render(
      <KuiLoadingMessage { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
