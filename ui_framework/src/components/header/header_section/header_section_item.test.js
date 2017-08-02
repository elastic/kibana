import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import { KuiHeaderSectionItem } from './header_section_item';

describe('KuiHeaderSectionItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiHeaderSectionItem {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('border', () => {
    test('defaults to left', () => {
      const component = render(
        <KuiHeaderSectionItem />
      );

      expect(component)
        .toMatchSnapshot();
    });

    test('renders right', () => {
      const component = render(
        <KuiHeaderSectionItem border="right" />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
