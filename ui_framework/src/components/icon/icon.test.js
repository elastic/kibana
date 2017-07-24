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
      <KuiIcon { ...requiredProps } />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('renders size', () => {
    SIZES.forEach(size => {
      test(size, () => {
        const component = render(
          <KuiIcon size={size} />
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
