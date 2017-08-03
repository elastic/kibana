import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiVerticalRhythm,
  SIZES,
} from './vertical_rhythm';

describe('KuiVerticalRhythm', () => {
  test('is rendered', () => {
    const component = render(
      <KuiVerticalRhythm { ...requiredProps }>
        <div>Hi</div>
      </KuiVerticalRhythm>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('renders size', () => {
    SIZES.forEach(size => {
      test(size, () => {
        const component = render(
          <KuiVerticalRhythm size={size}>
            <h1>hi</h1>
          </KuiVerticalRhythm>
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
