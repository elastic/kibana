import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

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

  describe('Props', () => {
    test('text', () => {
      const component = (
        <KuiLabel text="other label"/>
      );

      expect(render(component)).toMatchSnapshot();
    });

    test('htmlFor', () => {
      const component = (
        <div>
          <input type="text" id="input1"/>
          <KuiLabel htmlFor="input1" text="other label"/>
        </div>
      );

      expect(render(component)).toMatchSnapshot();
    });
  });
});
