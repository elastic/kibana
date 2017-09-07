import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiExpressionItem,
} from './expression_item';

describe('KuiExpressionItem', () => {
  test('renders', () => {
    const component = (
      <KuiExpressionItem {...requiredProps} />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('children', () => {
      test('is rendered', () => {
        const component = render(
          <KuiExpressionItem>
            some expression
          </KuiExpressionItem>
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
