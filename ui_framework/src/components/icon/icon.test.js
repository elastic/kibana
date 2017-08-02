import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiIcon,
  SIZES,
  TYPES,
} from './icon';

describe('KuiIcon', () => {
  test('is rendered', () => {
    const component = render(
      <KuiIcon type="search" {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('title', () => {
    test('defaults to a humanized version of the type', () => {
      const component = render(
        <KuiIcon type="dashboardApp" />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('is rendered', () => {
      const component = render(
        <KuiIcon type="search" title="a custom title" />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });

  describe('renders size', () => {
    SIZES.forEach(size => {
      test(size, () => {
        const component = render(
          <KuiIcon type="search" size={size} />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });

  describe('renders type', () => {
    TYPES.forEach(type => {
      test(type, () => {
        const component = render(
          <KuiIcon type={type} />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
