import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTitle,
  KuiText,
  TITLE_SIZES,
  TEXT_SIZES,
} from './typography';

describe('KuiTitle', () => {
  test('is rendered', () => {
    const component = render(
      <KuiTitle {...requiredProps}>
        <h1>Hello</h1>
      </KuiTitle>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('renders size', () => {
    TITLE_SIZES.forEach(size => {
      test(size, () => {
        const component = render(
          <KuiTitle size={size}>
            <h1>Hello</h1>
          </KuiTitle>
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});

describe('KuiText', () => {
  test('is rendered', () => {
    const component = render(
      <KuiText {...requiredProps}>
        <h1>Hello</h1>
      </KuiText>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('renders size', () => {
    TEXT_SIZES.forEach(size => {
      test(size, () => {
        const component = render(
          <KuiText size={size}>
            <p>Hello</p>
          </KuiText>
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
