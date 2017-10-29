import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiLabel
} from './label';

describe('KuiLabel', () => {
  test('renders', () => {
    const component = (
      <KuiLabel {...requiredProps}>
        {'label'}
      </KuiLabel>
    );

    expect(render(component)).toMatchSnapshot();
  });
});
